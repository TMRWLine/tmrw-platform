import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  ROSTER_DATA,
  ROSTER_SPECIMENS,
  suburbForPostcode,
  type RosterSpecimen,
} from '../data/roster';
import type { DeployPackageId } from '../lib/overlayEvents';

export type CatchmentRingId = '5km' | '15km' | '50km';

/** Storefront till. Postcode 2026, Bondi. */
const ANCHOR: L.LatLngExpression = [-33.8915, 151.2767];
const ANCHOR_LL = { lat: -33.8915, lng: 151.2767 };

export const CATCHMENT_RINGS: readonly {
  id: CatchmentRingId;
  label: string;
  radiusKm: number;
  zoom: number;
  packageId: DeployPackageId;
}[] = [
  { id: '5km', label: '5km', radiusKm: 5, zoom: 13, packageId: 'storefront' },
  { id: '15km', label: '15km', radiusKm: 15, zoom: 11, packageId: 'metro' },
  { id: '50km', label: '50km', radiusKm: 50, zoom: 9, packageId: 'regional' },
];

const TIER_ENTRY_AUD: Record<RosterSpecimen['tier'], number> = {
  storefront: 750,
  metro: 3500,
  regional: 50000,
};

export function ringForPackage(packageId: string | null): CatchmentRingId {
  const match = CATCHMENT_RINGS.find((ring) => ring.packageId === packageId);
  return match?.id ?? '5km';
}

export function ringById(id: CatchmentRingId) {
  return CATCHMENT_RINGS.find((ring) => ring.id === id) ?? CATCHMENT_RINGS[0];
}

function plainAud(amount: number): string {
  return `A$${Math.round(Math.abs(amount))}`;
}

function haversineKm(lat: number, lng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - ANCHOR_LL.lat);
  const dLng = toRad(lng - ANCHOR_LL.lng);
  const lat1 = toRad(ANCHOR_LL.lat);
  const lat2 = toRad(lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideRing(specimen: Pick<RosterSpecimen, 'lat' | 'lng'>, radiusKm: number): boolean {
  return haversineKm(specimen.lat, specimen.lng) <= radiusKm + 0.05;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pinCardHtml(specimen: RosterSpecimen): string {
  const record = ROSTER_DATA.find((entry) => entry.id === specimen.id);
  const club = record?.record.current_club ?? 'Club pending';
  return `<div style="min-width:180px;max-width:240px">
    <p style="margin:0;font-weight:800;font-size:14px;letter-spacing:-0.03em;color:#0F0F11">${escapeHtml(specimen.name)}</p>
    <p style="margin:6px 0 0;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#3A3A3C">${escapeHtml(specimen.sportLeague)}</p>
    <p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#737373">${escapeHtml(suburbForPostcode(specimen.postcode))} · ${escapeHtml(specimen.postcode)}</p>
    <p style="margin:8px 0 0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#A3A3A3">Junior club</p>
    <p style="margin:0;font-size:12px;line-height:1.35;color:#0F0F11">${escapeHtml(club)}</p>
    <p style="margin:8px 0 0;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;color:#0F0F11">Packages from ${plainAud(TIER_ENTRY_AUD[specimen.tier])}</p>
  </div>`;
}

function makeBeaconIcon(selected: boolean) {
  return L.divIcon({
    className: selected ? 'roster-beacon is-selected' : 'roster-beacon',
    html: '<span class="roster-beacon-dot"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeAnchorIcon() {
  return L.divIcon({
    className: 'roster-anchor',
    html: '<span class="roster-anchor-dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function animateCircleRadius(circle: L.Circle, toMeters: number) {
  const from = circle.getRadius();
  if (from === toMeters) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    circle.setRadius(toMeters);
    return;
  }
  const start = performance.now();
  const duration = 720;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const ease = 1 - (1 - t) ** 3;
    circle.setRadius(from + (toMeters - from) * ease);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

interface RosterCatchmentMapProps {
  activeRing: CatchmentRingId;
  /** Athletes that pass the roster search and tier filters. Radius applies on top. */
  specimens: readonly RosterSpecimen[];
  focusAthleteId: string | null;
  onSelectAthlete: (id: string) => void;
  onChangeRing: (id: CatchmentRingId) => void;
}

export const RosterCatchmentMap: React.FC<RosterCatchmentMapProps> = ({
  activeRing,
  specimens,
  focusAthleteId,
  onSelectAthlete,
  onChangeRing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const activeRingRef = useRef(activeRing);
  activeRingRef.current = activeRing;
  const circleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelectAthlete);
  onSelectRef.current = onSelectAthlete;

  const ring = ringById(activeRing);
  const visibleCount = useMemo(
    () => specimens.filter((specimen) => isInsideRing(specimen, ring.radiusKm)).length,
    [specimens, ring.radiusKm],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const opening = ringById(activeRingRef.current);
    const map = L.map(containerRef.current, {
      center: ANCHOR,
      zoom: opening.zoom,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
      maxZoom: 16,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, HERE, Garmin, OSM',
        maxZoom: 16,
      },
    ).addTo(map);

    L.marker(ANCHOR, { icon: makeAnchorIcon(), interactive: false, zIndexOffset: 400 }).addTo(map);

    circleRef.current = L.circle(ANCHOR, {
      radius: opening.radiusKm * 1000,
      color: '#0F0F11',
      weight: 1,
      fillColor: '#0F0F11',
      fillOpacity: 0.04,
      className: 'roster-catchment-ring',
      interactive: false,
    }).addTo(map);

    ROSTER_SPECIMENS.forEach((specimen) => {
      const marker = L.marker([specimen.lat, specimen.lng], {
        icon: makeBeaconIcon(false),
        title: specimen.name,
      });
      marker.bindTooltip(pinCardHtml(specimen), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'roster-pin-card',
        sticky: false,
      });
      marker.on('click', () => onSelectRef.current(specimen.id));
      markersRef.current.set(specimen.id, marker);
    });

    mapRef.current = map;

    const resize = () => map.invalidateSize();
    const t1 = window.setTimeout(resize, 60);
    const t2 = window.setTimeout(resize, 320);
    window.addEventListener('resize', resize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      circleRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    const next = ringById(activeRing);
    animateCircleRadius(circle, next.radiusKm * 1000);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo(ANCHOR, next.zoom, { duration: reduceMotion ? 0 : 0.7 });
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [activeRing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const allowed = new Set(specimens.map((specimen) => specimen.id));
    const radiusKm = ringById(activeRing).radiusKm;
    markersRef.current.forEach((marker, id) => {
      const specimen = ROSTER_SPECIMENS.find((item) => item.id === id);
      const inside = specimen ? isInsideRing(specimen, radiusKm) : false;
      const show = allowed.has(id) && (inside || id === focusAthleteId);
      marker.setIcon(makeBeaconIcon(id === focusAthleteId && show));
      if (show) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else if (map.hasLayer(marker)) {
        marker.closeTooltip();
        marker.remove();
      }
    });
  }, [specimens, activeRing, focusAthleteId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusAthleteId) return;
    const specimen = ROSTER_SPECIMENS.find((item) => item.id === focusAthleteId);
    if (!specimen) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo([specimen.lat, specimen.lng], 13, { duration: reduceMotion ? 0 : 0.7 });
  }, [focusAthleteId]);

  const zoomBy = (delta: number) => {
    mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + delta);
  };

  return (
    <div className="relative h-[460px] overflow-hidden rounded-2xl border border-neutral-200 bg-[#F4F3F0] md:h-[540px]">
      <div ref={containerRef} className="roster-map absolute inset-0" />

      <div
        className="absolute left-4 top-4 z-[500] flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Catchment radius"
      >
        {CATCHMENT_RINGS.map((item) => {
          const active = item.id === activeRing;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeRing(item.id)}
              aria-pressed={active}
              className={`rounded-full px-4 py-1.5 text-xs font-mono font-medium shadow-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F11] focus-visible:ring-offset-2 ${
                active
                  ? 'border border-[#CCFF00] bg-[#CCFF00] text-black'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:border-black'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {visibleCount} athletes inside the {ring.label} catchment.
      </p>

      <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => zoomBy(1)}
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white font-mono text-lg leading-none text-[#0F0F11] shadow-sm transition-colors hover:border-black cursor-pointer"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-1)}
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white font-mono text-lg leading-none text-[#0F0F11] shadow-sm transition-colors hover:border-black cursor-pointer"
        >
          −
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-4 z-[500] m-0 rounded-full border border-neutral-200 bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {visibleCount} in {ring.label} · Postcode 2026
      </p>
    </div>
  );
};

export default RosterCatchmentMap;
