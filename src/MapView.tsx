import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { AthleteLocation, MatchedSponsor } from './types';
import { displayName } from './lib/formatName';

interface MapViewProps {
  athlete: AthleteLocation | null;
  sponsors: MatchedSponsor[];
  catchmentMeters?: number;
  className?: string;
  selectedSponsorId?: string | null;
  onSelectSponsor?: (id: string) => void;
  roster?: AthleteLocation[];
}

function makeAthleteIcon() {
  return L.divIcon({
    className: 'map-pin-athlete',
    html: '<div class="pin-dot pin-athlete"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const CLUB_GEOFENCE_METERS = 15000;
const METERS_PER_DEGREE_LAT = 110574;
const VOLT_GEOFENCE: L.CircleOptions = {
  radius: CLUB_GEOFENCE_METERS,
  color: 'rgba(210, 255, 0, 0.35)',
  weight: 1,
  fillColor: 'rgba(210, 255, 0, 0.08)',
  fillOpacity: 1,
  interactive: false,
};

function perimeterNorth(lat: number, lng: number, radiusMeters: number): L.LatLngExpression {
  return [lat + radiusMeters / METERS_PER_DEGREE_LAT, lng];
}

function makeCatchmentLabel(postcode: string | null) {
  const title = postcode ? escapeHtml(postcode) : 'CLUB';
  return L.divIcon({
    className: 'catchment-perimeter-label',
    html:
      `<div class="-translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#D2FF00]/40 bg-[#08080A]/85 px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase text-[#D2FF00] tabular-nums">` +
      `${title} · 15 KM store radius</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function addClubCatchment(
  layer: L.LayerGroup,
  lat: number,
  lng: number,
  postcode: string | null,
  labelled: Set<string>
) {
  L.circle([lat, lng], VOLT_GEOFENCE).addTo(layer);
  const labelKey = postcode ?? `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (labelled.has(labelKey)) return;
  labelled.add(labelKey);
  L.marker(perimeterNorth(lat, lng, CLUB_GEOFENCE_METERS), {
    icon: makeCatchmentLabel(postcode),
    interactive: false,
    keyboard: false,
  }).addTo(layer);
}

function makeSponsorIcon(selected = false) {
  return L.divIcon({
    className: selected ? 'map-pin-sponsor is-selected' : 'map-pin-sponsor',
    html: `<div class="pin-dot pin-sponsor${selected ? ' is-selected' : ''}"></div>`,
    iconSize: selected ? [18, 18] : [14, 14],
    iconAnchor: selected ? [9, 9] : [7, 7],
  });
}

export default function MapView({
  athlete,
  sponsors,
  catchmentMeters = 5000,
  className,
  selectedSponsorId = null,
  onSelectSponsor,
  roster,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelectSponsor);
  onSelectRef.current = onSelectSponsor;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-37.8136, 144.9631],
      zoom: 13,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = () => map.invalidateSize();
    const t1 = window.setTimeout(resize, 200);
    const t2 = window.setTimeout(resize, 400);
    window.addEventListener('resize', resize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    markerByIdRef.current.clear();

    const points: L.LatLngExpression[] = [];
    const labelledPostcodes = new Set<string>();

    if (athlete && athlete.lat != null && athlete.lng != null) {
      const pos: L.LatLngExpression = [athlete.lat, athlete.lng];
      addClubCatchment(layer, athlete.lat, athlete.lng, athlete.postcode, labelledPostcodes);
      if (catchmentMeters > 0 && catchmentMeters !== CLUB_GEOFENCE_METERS) {
        L.circle(pos, {
          radius: catchmentMeters,
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(layer);
      }
      L.marker(pos, { icon: makeAthleteIcon() })
        .addTo(layer)
        .bindPopup(athletePopupHtml(athlete));
      points.push(pos);
    }

    (roster ?? []).forEach((pin) => {
      if (pin.lat == null || pin.lng == null) return;
      if (athlete && pin.id === athlete.id) return;
      const pos: L.LatLngExpression = [pin.lat, pin.lng];
      addClubCatchment(layer, pin.lat, pin.lng, pin.postcode, labelledPostcodes);
      L.marker(pos, { icon: makeAthleteIcon() })
        .addTo(layer)
        .bindPopup(athletePopupHtml(pin));
      points.push(pos);
    });

    sponsors.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const pos: L.LatLngExpression = [s.lat, s.lng];
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

      const marker = L.marker(pos, { icon: makeSponsorIcon(false) })
        .addTo(layer)
        .bindPopup(sponsorPopupHtml(s));
      marker.on('click', () => onSelectRef.current?.(s.id));
      markerByIdRef.current.set(s.id, marker);
      points.push(pos);
    });

    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
    window.setTimeout(() => map.invalidateSize(), 200);
    window.setTimeout(() => map.invalidateSize(), 400);
    const selectedId = selectedSponsorId;
    if (selectedId) {
      const selectedMarker = markerByIdRef.current.get(selectedId);
      selectedMarker?.setIcon(makeSponsorIcon(true));
    }
  }, [athlete, sponsors, catchmentMeters, roster]);

  useEffect(() => {
    const map = mapRef.current;
    markerByIdRef.current.forEach((marker, id) => {
      marker.setIcon(makeSponsorIcon(id === selectedSponsorId));
    });
    if (!map || !selectedSponsorId) return;
    const marker = markerByIdRef.current.get(selectedSponsorId);
    if (!marker) return;
    map.panTo(marker.getLatLng(), { animate: true });
    window.setTimeout(() => marker.openPopup(), 120);
  }, [selectedSponsorId]);

  return (
    <div className={['relative h-full w-full overflow-hidden', className].filter(Boolean).join(' ')}>
      <div ref={containerRef} className="map-container relative h-full w-full overflow-hidden" />
    </div>
  );
}

function athletePopupHtml(pin: AthleteLocation): string {
  const compliance: string[] = [];
  if (pin.master_licence_signed) compliance.push('Master Licence');
  if (pin.nrl_tpa_registered) compliance.push('NRL TPA');
  if (pin.shute_shield_compliant) compliance.push('Shute Shield');
  const complianceLine =
    compliance.length > 0 ? `<br/><span class="popup-sub">${compliance.join(' &middot; ')}</span>` : '';
  return `<div class="map-popup"><strong>${escapeHtml(displayName(pin.name))}</strong><br/><span class="popup-sub">Athlete${pin.postcode ? ' &middot; ' + escapeHtml(pin.postcode) : ''}${pin.follower_count != null ? ' &middot; ' + pin.follower_count.toLocaleString() + ' followers' : ''}</span>${complianceLine}</div>`;
}

function sponsorPopupHtml(s: MatchedSponsor): string {
  const category = s.merchant_category ?? 'Sponsor';
  const distance = formatDistance(s.distance_km);
  const bits = [distance, `Confirmed · ${escapeHtml(category)}`].filter(Boolean);
  return (
    `<div class="map-popup"><strong>${escapeHtml(s.business_name)}</strong><br/>` +
    `<span class="popup-sub">${bits.join(' · ')}</span></div>`
  );
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
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}
