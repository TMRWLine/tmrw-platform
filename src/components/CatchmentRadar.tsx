import { motion } from 'motion/react';
import { landmarksWithin, type GeoPoint } from '../lib/catchmentLandmarks';

const SIZE = 260;
const C = SIZE / 2;
const R = 108;
const RINGS_KM = [5, 10, 15];

export function CatchmentRadar({
  origin,
  approximate,
  geofenceKm,
  suburb,
  postcode,
  club,
  communityReach,
}: {
  origin: GeoPoint;
  approximate: boolean;
  geofenceKm: number;
  suburb: string;
  postcode: string;
  club: string;
  communityReach: number;
}) {
  const scaleKm = Math.max(15, geofenceKm);
  const toPx = (km: number) => (km / scaleKm) * R;
  const landmarks = landmarksWithin(origin, scaleKm);
  const sweep = describeWedge(C, C, R, -130, -90);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0">
          Suburban catchment radar
        </p>
        <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-600">
          {approximate ? 'Approx. · postcode centroid' : 'Registered club location'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block w-full max-w-[300px] mx-auto"
        role="img"
        aria-label={`${geofenceKm} km catchment around ${club}, ${suburb} ${postcode}`}
      >
        <defs>
          <radialGradient id="catchment-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D2FF00" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#D2FF00" stopOpacity="0.03" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={toPx(geofenceKm)} fill="url(#catchment-fill)" stroke="#D2FF00" strokeOpacity="0.55" strokeWidth="1" />

        {RINGS_KM.map((km) => (
          <g key={km}>
            <circle cx={C} cy={C} r={toPx(km)} fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeDasharray="2 3" />
            <text x={C + 3} y={C - toPx(km) + 9} fill="#71717a" fontSize="7" fontFamily="ui-monospace, monospace">
              {km} km
            </text>
          </g>
        ))}
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#ffffff" strokeOpacity="0.06" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#ffffff" strokeOpacity="0.06" />
        <text x={C} y={C - R - 6} textAnchor="middle" fill="#52525b" fontSize="7" fontFamily="ui-monospace, monospace">
          N
        </text>

        <g
          className="animate-spin"
          style={{ animationDuration: '6s', transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' }}
        >
          <path d={sweep} fill="#D2FF00" fillOpacity="0.08" />
          <line x1={C} y1={C} x2={C} y2={C - R} stroke="#D2FF00" strokeOpacity="0.5" strokeWidth="1" />
        </g>

        {landmarks.map((l) => {
          const x = C + toPx(l.xKm);
          const y = C - toPx(l.yKm);
          const right = l.xKm >= 0;
          return (
            <g key={l.name}>
              <circle cx={x} cy={y} r="2" fill="#e4e4e7" />
              <text
                x={right ? x + 4 : x - 4}
                y={y + 2.5}
                textAnchor={right ? 'start' : 'end'}
                fill="#a1a1aa"
                fontSize="7"
                fontFamily="ui-monospace, monospace"
              >
                {l.name} · {l.distanceKm.toFixed(1)}km
              </text>
            </g>
          );
        })}

        {landmarks.length === 0 && (
          <text x={C} y={C + R - 10} textAnchor="middle" fill="#52525b" fontSize="7" fontFamily="ui-monospace, monospace">
            No mapped landmarks within {scaleKm} km
          </text>
        )}

        <motion.circle
          cx={C}
          cy={C}
          fill="none"
          stroke="#D2FF00"
          strokeWidth="1.5"
          initial={{ r: 4, opacity: 0.8 }}
          animate={{ r: 22, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
        <circle cx={C} cy={C} r="4" fill="#D2FF00" />
        <text x={C} y={C + 15} textAnchor="middle" fill="#D2FF00" fontSize="7" fontWeight="700" fontFamily="ui-monospace, monospace">
          {club.toUpperCase().slice(0, 28)}
        </text>
      </svg>

      <div className="flex gap-2 mt-4">
        <RadarMetric label="Radius" value={`${geofenceKm} km`} />
        <RadarMetric label="Match-day reach" value={communityReach.toLocaleString('en-AU')} />
        <RadarMetric label="Primary suburb" value={`${suburb} ${postcode}`} />
      </div>
    </div>
  );
}

function RadarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
      <div className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mb-1">{label}</div>
      <div className="font-mono text-xs text-[#D2FF00] truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function describeWedge(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}
