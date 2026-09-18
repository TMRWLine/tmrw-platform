import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { AthleteLocation, MatchedSponsor } from './types';
import { displayName } from './lib/formatName';

interface MapViewProps {
  athlete: AthleteLocation | null;
  sponsors: MatchedSponsor[];
}

// Custom DivIcons styled to match the dark theme.
function makeAthleteIcon() {
  return L.divIcon({
    className: 'map-pin-athlete',
    html: '<div class="pin-dot pin-athlete"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function makeSponsorIcon() {
  return L.divIcon({
    className: 'map-pin-sponsor',
    html: '<div class="pin-dot pin-sponsor"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapView({ athlete, sponsors }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Fix: Leaflet needs invalidateSize after the container becomes visible.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Update markers when data changes.
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    const points: L.LatLngExpression[] = [];

    // Athlete marker
    if (athlete && athlete.lat != null && athlete.lng != null) {
      const pos: L.LatLngExpression = [athlete.lat, athlete.lng];
      const compliance: string[] = [];
      if (athlete.master_licence_signed) compliance.push('Master Licence');
      if (athlete.nrl_tpa_registered) compliance.push('NRL TPA');
      if (athlete.shute_shield_compliant) compliance.push('Shute Shield');
      const complianceLine = compliance.length > 0 ? `<br/><span class="popup-sub">${compliance.join(' &middot; ')}</span>` : '';
      L.marker(pos, { icon: makeAthleteIcon() })
        .addTo(layer)
        .bindPopup(
          `<div class="map-popup"><strong>${escapeHtml(displayName(athlete?.name))}</strong><br/><span class="popup-sub">Athlete${athlete.postcode ? ' &middot; ' + escapeHtml(athlete.postcode) : ''}${athlete.follower_count != null ? ' &middot; ' + athlete.follower_count.toLocaleString() + ' followers' : ''}</span>${complianceLine}</div>`
        );
      points.push(pos);
    }

    // Sponsor markers + radius circles
    sponsors.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const pos: L.LatLngExpression = [s.lat, s.lng];

      // Radius circle showing the sponsor's catchment area
      if (s.target_radius_meters) {
        L.circle(pos, {
          radius: s.target_radius_meters,
          color: '#000000',
          fillColor: '#000000',
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '4 4',
        }).addTo(layer);
      }

      L.marker(pos, { icon: makeSponsorIcon() })
        .addTo(layer)
        .bindPopup(
          `<div class="map-popup"><strong>${escapeHtml(s.business_name)}</strong><br/>` +
            `<span class="popup-sub">${escapeHtml(s.merchant_category ?? 'Sponsor')} &middot; ${formatDistance(s.distance_km)} &middot; ${formatRadius(s.target_radius_meters)}${s.currency ? ' &middot; ' + escapeHtml(s.currency) : ''}</span></div>`
        );
      points.push(pos);
    });

    // Fit bounds to show all markers
    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 12);
      } else {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [athlete, sponsors]);

  return <div ref={containerRef} className="map-container" />;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDistance(km: number | undefined): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatRadius(m: number | undefined): string {
  if (m == null) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(0)} km radius`;
  return `${m} m radius`;
}
