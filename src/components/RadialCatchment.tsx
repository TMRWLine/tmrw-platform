import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { emitOverlayEvent, OPEN_DEPLOY_DRAWER_EVENT, type DeployPackageId } from '../lib/overlayEvents';

const VOLT = '#CCFF00';
const CHALK = '#FFFFFF';
const LICHEN = '#DCE5DC';
const SLATE = '#262626';

const VB_W = 1600;
const VB_H = 1000;
const KM_PER_DEG = 111.32;
const LAT_SPAN_KM = 0.26 * KM_PER_DEG;
const LNG_SPAN_KM = LAT_SPAN_KM * (VB_W / VB_H);
/** Geographic centre of the active suburb sits in the middle of the panoramic sheet. */
const TOP_NORTH_KM = LAT_SPAN_KM / 2;

type CatchmentMode = '5km' | '15km' | '50km';
type CategoryStatus = 'AVAILABLE' | 'CLEARED';

const MODES: readonly {
  id: CatchmentMode;
  label: string;
  km: number;
  packageId: DeployPackageId;
}[] = [
  { id: '5km', label: '5KM LOCAL TITLE', km: 5, packageId: 'storefront' },
  { id: '15km', label: '15KM DISTRICT CLUSTER', km: 15, packageId: 'metro' },
  { id: '50km', label: '50KM REGIONAL SYNDICATE', km: 50, packageId: 'regional' },
];

interface TerritoryPin {
  id: string;
  parcel: string;
  contender: string;
  label: string;
  club: string;
  category: string;
  status: CategoryStatus;
  retainer: number;
  eastKm: number;
  northKm: number;
  km: number;
}

interface WaterLabel {
  eastKm: number;
  northKm: number;
  text: string;
}

interface CadastralRegister {
  id: string;
  suburb: string;
  postcode: string;
  region: string;
  lat: number;
  lng: number;
  pins: readonly TerritoryPin[];
  land: string;
  streets: string;
  arterials: string;
  waterways: string;
  parcels: string;
  waterLabel: WaterLabel | null;
}

function pin(spec: Omit<TerritoryPin, 'km'>): TerritoryPin {
  return { ...spec, km: Math.hypot(spec.eastKm, spec.northKm) };
}

function modeById(id: CatchmentMode) {
  return MODES.find((item) => item.id === id) ?? MODES[0];
}

function projectKm(eastKm: number, northKm: number) {
  return {
    x: ((eastKm + LNG_SPAN_KM / 2) / LNG_SPAN_KM) * VB_W,
    y: ((TOP_NORTH_KM - northKm) / LAT_SPAN_KM) * VB_H,
  };
}

function kmToViewRadius(km: number) {
  return (km / LAT_SPAN_KM) * VB_H;
}

function ringPath(ring: readonly [number, number][]): string {
  return `${ring
    .map(([eastKm, northKm], index) => {
      const { x, y } = projectKm(eastKm, northKm);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}

function linePath(line: readonly (readonly [number, number])[]): string {
  return line
    .map(([eastKm, northKm], index) => {
      const { x, y } = projectKm(eastKm, northKm);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function linesPath(lines: readonly (readonly (readonly [number, number])[])[]): string {
  return lines.map((line) => linePath(line)).join(' ');
}

function buildParcels(seed: number): string {
  const cols = 26;
  const rows = 16;
  const gw = VB_W / cols;
  const gh = VB_H / rows;
  const parts: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const jx = ((row * 17 + col * 13 + seed) % 9) - 4;
      const jy = ((row * 11 + col * 19 + seed) % 9) - 4;
      const x = col * gw + 3 + jx;
      const y = row * gh + 3 + jy;
      const w = gw - 8 - ((col + row + seed) % 3);
      const h = gh - 8 - ((col * 2 + row) % 4);
      parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`);
    }
  }
  return parts.join('');
}

function buildStreets(seed: number): string {
  const parts: string[] = [];
  const tilt = ((seed % 5) - 2) * 0.012;
  for (let east = -22; east <= 22; east += 1.55) {
    const a = projectKm(east, 10);
    const b = projectKm(east + tilt * 16, -18);
    parts.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
  }
  for (let north = -16; north <= 9; north += 1.28) {
    const a = projectKm(-26, north);
    const b = projectKm(26, north + tilt * 12);
    parts.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
  }
  return parts.join('');
}

const SHEET_LAND: readonly [number, number][] = [
  [-30, 14],
  [30, 14],
  [30, -22],
  [-30, -22],
];

const BONDI_LAND: readonly [number, number][] = [
  [-30, 12],
  [1.5, 12],
  [2.4, 9],
  [1.3, 6.5],
  [2.8, 4.2],
  [1.6, 2.2],
  [3.2, 0.4],
  [1.7, -2],
  [2.6, -5],
  [1.4, -9],
  [2.2, -14],
  [-30, -20],
];

const BURLEIGH_LAND: readonly [number, number][] = [
  [-30, 12],
  [0.9, 12],
  [1.8, 8.4],
  [0.7, 5.6],
  [2.4, 3.4],
  [1.0, 1.2],
  [2.9, -0.6],
  [1.2, -3.2],
  [2.5, -6.4],
  [0.8, -10],
  [1.9, -16],
  [-30, -20],
];

const PONSONBY_LAND: readonly [number, number][] = [
  [-30, -22],
  [30, -22],
  [30, 0.7],
  [18, 2.1],
  [10, 0.9],
  [4, 2.6],
  [-1, 1.2],
  [-8, 2.8],
  [-16, 1.3],
  [-24, 2.4],
  [-30, 0.5],
];

function sheet(
  partial: Omit<CadastralRegister, 'land' | 'streets' | 'arterials' | 'waterways' | 'parcels'> & {
    landRing: readonly [number, number][];
    arterialLines: readonly (readonly (readonly [number, number])[])[];
    waterwayLines: readonly (readonly (readonly [number, number])[])[];
    seed: number;
  },
): CadastralRegister {
  return {
    id: partial.id,
    suburb: partial.suburb,
    postcode: partial.postcode,
    region: partial.region,
    lat: partial.lat,
    lng: partial.lng,
    pins: partial.pins,
    waterLabel: partial.waterLabel,
    land: ringPath(partial.landRing),
    streets: buildStreets(partial.seed),
    arterials: linesPath(partial.arterialLines),
    waterways: linesPath(partial.waterwayLines),
    parcels: buildParcels(partial.seed),
  };
}

const REGISTERS: readonly CadastralRegister[] = [
  sheet({
    id: 'bondi',
    suburb: 'Bondi',
    postcode: '2026',
    region: 'SYDNEY EAST',
    lat: -33.8915,
    lng: 151.2743,
    seed: 2,
    landRing: BONDI_LAND,
    waterLabel: { eastKm: 10, northKm: 2.4, text: 'TASMAN SEA' },
    waterwayLines: [],
    arterialLines: [
      [[-0.4, 8.2], [-0.55, 4], [-0.35, 0.6], [-0.7, -4]],
      [[-14, 1.6], [-8, 1.1], [-3, 0.7], [-0.5, 0.5]],
      [[-6.5, 7.4], [-5.2, 3.2], [-4.4, 0.4]],
      [[-12, 4.2], [-7, 3.6], [-2.2, 3.1]],
    ],
    pins: [
      pin({ id: 'b01', parcel: '01', contender: 'H. Bligh', label: 'NBL1 EAST BASKETBALL', club: 'City of Sydney Basketball Association', category: 'SPECIALTY COFFEE & BEVERAGE', status: 'AVAILABLE', retainer: 750, eastKm: -0.4, northKm: 0.6 }),
      pin({ id: 'b02', parcel: '02', contender: 'A. Keene', label: 'WSL SURF', club: 'Bondi Surf Lifesaving', category: 'APPAREL & FOOTWEAR', status: 'AVAILABLE', retainer: 750, eastKm: -1.2, northKm: 1.1 }),
      pin({ id: 'b03', parcel: '03', contender: 'S. Blake', label: 'NSW TRIATHLON', club: 'Eastern Suburbs Tri Club', category: 'RECOVERY TECH', status: 'AVAILABLE', retainer: 750, eastKm: -0.7, northKm: 2 }),
      pin({ id: 'b04', parcel: '04', contender: 'N. Crowe', label: 'NSW ATHLETICS', club: 'Easts Athletics', category: 'SPORTS PHYSIO', status: 'AVAILABLE', retainer: 750, eastKm: -2.4, northKm: 1.5 }),
      pin({ id: 'b05', parcel: '05', contender: 'T. Vale', label: 'SHUTE SHIELD', club: 'Waverley Juniors', category: 'NUTRITION', status: 'AVAILABLE', retainer: 750, eastKm: -3.1, northKm: 2.6 }),
      pin({ id: 'b06', parcel: '06', contender: 'L. Hart', label: 'STATE SWIMMING', club: 'Randwick Swim Club', category: 'SUN CARE', status: 'CLEARED', retainer: 750, eastKm: -1.8, northKm: 3.6 }),
      pin({ id: 'b07', parcel: '07', contender: 'M. Ortiz', label: 'NPL FOOTBALL', club: 'Sydney East Football', category: 'AUTOMOTIVE', status: 'AVAILABLE', retainer: 3500, eastKm: -6.4, northKm: 3.4 }),
      pin({ id: 'b08', parcel: '08', contender: 'K. Ross', label: 'NSW CUP', club: 'South Sydney Juniors', category: 'WORKWEAR', status: 'CLEARED', retainer: 3500, eastKm: -5.2, northKm: 6.5 }),
      pin({ id: 'b09', parcel: '09', contender: 'M. Thorne', label: 'NBL1 BASKETBALL', club: 'Bankstown Basketball Association', category: 'LOCAL BANKING', status: 'AVAILABLE', retainer: 50000, eastKm: -14.5, northKm: 6.2 }),
    ],
  }),
  sheet({
    id: 'richmond',
    suburb: 'Richmond',
    postcode: '3121',
    region: 'MELBOURNE INNER',
    lat: -37.8182,
    lng: 144.998,
    seed: 5,
    landRing: SHEET_LAND,
    waterLabel: { eastKm: 3.2, northKm: -2.5, text: 'YARRA' },
    waterwayLines: [
      [[-26, -1.7], [-16, -2.5], [-8, -1.6], [-1, -2.7], [7, -1.8], [15, -2.6], [26, -1.9]],
    ],
    arterialLines: [
      [[-16, 2.2], [-8, 1.6], [0, 1.2], [8, 1.8], [16, 2.4]],
      [[-2, 8], [-1.4, 4], [-0.8, 0], [-1.6, -6]],
      [[-12, 5.4], [-4, 4.6], [4, 5.2], [12, 4.4]],
      [[2, 7.2], [3.2, 3], [2.4, -1]],
    ],
    pins: [
      pin({ id: 'r01', parcel: '01', contender: 'C. Nguyen', label: 'NBL1 SOUTH BASKETBALL', club: 'Richmond Basketball Club', category: 'SPECIALTY COFFEE & BEVERAGE', status: 'AVAILABLE', retainer: 750, eastKm: 0.4, northKm: 0.5 }),
      pin({ id: 'r02', parcel: '02', contender: 'P. Adler', label: 'VAFA FOOTBALL', club: 'Richmond Junior Football Club', category: 'LOCAL BANKING', status: 'AVAILABLE', retainer: 750, eastKm: -1.1, northKm: 1.3 }),
      pin({ id: 'r03', parcel: '03', contender: 'E. Marsh', label: 'VIC ATHLETICS', club: 'Richmond Harriers', category: 'SPORTS PHYSIO', status: 'AVAILABLE', retainer: 750, eastKm: 1.5, northKm: 1.6 }),
      pin({ id: 'r04', parcel: '04', contender: 'J. Okoye', label: 'STATE SWIMMING', club: 'Richmond Swim Club', category: 'SUN CARE', status: 'AVAILABLE', retainer: 750, eastKm: -2.2, northKm: 2.4 }),
      pin({ id: 'r05', parcel: '05', contender: 'S. Patel', label: 'VIC CYCLING', club: 'Hawthorn Cycling Club', category: 'AUTOMOTIVE', status: 'CLEARED', retainer: 750, eastKm: 2.8, northKm: 2.2 }),
      pin({ id: 'r06', parcel: '06', contender: 'R. Cole', label: 'NPL VICTORIA', club: 'Richmond Soccer Club', category: 'NUTRITION', status: 'AVAILABLE', retainer: 750, eastKm: -0.6, northKm: 4 }),
      pin({ id: 'r07', parcel: '07', contender: 'A. Frost', label: 'VFL FOOTBALL', club: 'Yarra Junior Football Club', category: 'WORKWEAR', status: 'AVAILABLE', retainer: 3500, eastKm: 6, northKm: 4.2 }),
      pin({ id: 'r08', parcel: '08', contender: 'L. Ibrahim', label: 'ROWING VICTORIA', club: 'Power House Rowing Club', category: 'APPAREL & FOOTWEAR', status: 'AVAILABLE', retainer: 3500, eastKm: -5.8, northKm: 5.6 }),
      pin({ id: 'r09', parcel: '09', contender: 'D. Kerr', label: 'STATE HOCKEY', club: 'Melbourne East Hockey', category: 'RECOVERY TECH', status: 'AVAILABLE', retainer: 50000, eastKm: 14.5, northKm: 6.5 }),
    ],
  }),
  sheet({
    id: 'burleigh',
    suburb: 'Burleigh Heads',
    postcode: '4220',
    region: 'GOLD COAST',
    lat: -28.0985,
    lng: 153.455,
    seed: 8,
    landRing: BURLEIGH_LAND,
    waterLabel: { eastKm: 10, northKm: 1.6, text: 'PACIFIC' },
    waterwayLines: [
      [[-18, -5.6], [-10, -4.8], [-4, -5.8], [-0.8, -4.9]],
    ],
    arterialLines: [
      [[-0.35, 8], [-0.5, 4], [-0.25, 1], [-0.6, -4]],
      [[-14, 2.4], [-8, 1.8], [-3, 1.2], [-0.4, 0.8]],
      [[-7, 6.8], [-5.5, 3.5], [-4.6, 0.6]],
      [[-11, 5], [-6, 4.4], [-2, 4.8]],
    ],
    pins: [
      pin({ id: 'g01', parcel: '01', contender: 'M. Shaw', label: 'WSL SURF', club: 'Burleigh Heads Boardriders', category: 'SUN CARE', status: 'AVAILABLE', retainer: 750, eastKm: -0.5, northKm: 0.4 }),
      pin({ id: 'g02', parcel: '02', contender: 'T. Nguyen', label: 'QLD SURF LIFE SAVING', club: 'Burleigh Heads Mowbray Park SLSC', category: 'APPAREL & FOOTWEAR', status: 'AVAILABLE', retainer: 750, eastKm: -1.4, northKm: 0.8 }),
      pin({ id: 'g03', parcel: '03', contender: 'A. Brooks', label: 'NBL1 NORTH BASKETBALL', club: 'Burleigh Basketball Club', category: 'SPECIALTY COFFEE & BEVERAGE', status: 'AVAILABLE', retainer: 750, eastKm: -0.8, northKm: 1.8 }),
      pin({ id: 'g04', parcel: '04', contender: 'K. Walsh', label: 'QLD TRIATHLON', club: 'Burleigh Tri Club', category: 'RECOVERY TECH', status: 'AVAILABLE', retainer: 750, eastKm: -2.6, northKm: 2 }),
      pin({ id: 'g05', parcel: '05', contender: 'H. Singh', label: 'QLD ATHLETICS', club: 'Gold Coast Athletics', category: 'NUTRITION', status: 'CLEARED', retainer: 750, eastKm: -3.4, northKm: 1.4 }),
      pin({ id: 'g06', parcel: '06', contender: 'F. Doyle', label: 'QLD JUNIOR RUGBY LEAGUE', club: 'Burleigh Heads Juniors', category: 'WORKWEAR', status: 'AVAILABLE', retainer: 750, eastKm: -1.5, northKm: 3.8 }),
      pin({ id: 'g07', parcel: '07', contender: 'C. Bennett', label: 'NPL QUEENSLAND', club: 'Tweed Gold Coast Football', category: 'AUTOMOTIVE', status: 'AVAILABLE', retainer: 3500, eastKm: -6.2, northKm: 4 }),
      pin({ id: 'g08', parcel: '08', contender: 'P. Leilua', label: 'QLD CUP', club: 'Burleigh Heads Junior Rugby League', category: 'LOCAL BANKING', status: 'CLEARED', retainer: 3500, eastKm: -4.8, northKm: 6.6 }),
      pin({ id: 'g09', parcel: '09', contender: 'S. Marlow', label: 'STATE SWIMMING', club: 'Miami Swim Club', category: 'SUN CARE', status: 'AVAILABLE', retainer: 50000, eastKm: -15, northKm: 5.5 }),
    ],
  }),
  sheet({
    id: 'ponsonby',
    suburb: 'Ponsonby',
    postcode: '1011',
    region: 'AUCKLAND CENTRAL',
    lat: -36.8515,
    lng: 174.7445,
    seed: 11,
    landRing: PONSONBY_LAND,
    waterLabel: { eastKm: 2, northKm: 6.4, text: 'WAITEMATA' },
    waterwayLines: [],
    arterialLines: [
      [[-14, 0.2], [-8, 0.45], [-2, 0.3], [4, 0.55], [10, 0.25]],
      [[-1.2, 1.1], [-0.6, -2], [-1.4, -8]],
      [[-8, 0.8], [-6, -3], [-4, -8]],
      [[2, 1], [3.2, -2], [2.4, -7]],
    ],
    pins: [
      pin({ id: 'p01', parcel: '01', contender: 'W. Te Ao', label: 'NBL BASKETBALL', club: 'Ponsonby Basketball Club', category: 'SPECIALTY COFFEE & BEVERAGE', status: 'AVAILABLE', retainer: 750, eastKm: 0.2, northKm: 0.5 }),
      pin({ id: 'p02', parcel: '02', contender: 'A. Reid', label: 'AUCKLAND RUGBY', club: 'Ponsonby Rugby Club', category: 'LOCAL BANKING', status: 'AVAILABLE', retainer: 750, eastKm: -1.1, northKm: 0.3 }),
      pin({ id: 'p03', parcel: '03', contender: 'S. Clarke', label: 'AUCKLAND SWIMMING', club: 'Ponsonby Swim Club', category: 'SUN CARE', status: 'AVAILABLE', retainer: 750, eastKm: 1.3, northKm: -0.4 }),
      pin({ id: 'p04', parcel: '04', contender: 'M. Faumuina', label: 'WAKA AMA', club: 'West End Waka Ama', category: 'APPAREL & FOOTWEAR', status: 'AVAILABLE', retainer: 750, eastKm: -2.2, northKm: 1 }),
      pin({ id: 'p05', parcel: '05', contender: 'L. Chen', label: 'AUCKLAND ATHLETICS', club: 'Ponsonby Athletics', category: 'NUTRITION', status: 'AVAILABLE', retainer: 750, eastKm: 2.4, northKm: 0.8 }),
      pin({ id: 'p06', parcel: '06', contender: 'J. Moretti', label: 'NRFL FOOTBALL', club: 'Western Springs Football', category: 'RECOVERY TECH', status: 'CLEARED', retainer: 750, eastKm: -3.6, northKm: 1.1 }),
      pin({ id: 'p07', parcel: '07', contender: 'R. Ngata', label: 'AUCKLAND RUGBY', club: 'Grey Lynn Amateur', category: 'WORKWEAR', status: 'AVAILABLE', retainer: 3500, eastKm: 5.4, northKm: 0.4 }),
      pin({ id: 'p08', parcel: '08', contender: 'T. Blake', label: 'NZ ROAD CYCLING', club: 'Auckland Central Cycling', category: 'AUTOMOTIVE', status: 'AVAILABLE', retainer: 3500, eastKm: -6.6, northKm: 1 }),
      pin({ id: 'p09', parcel: '09', contender: 'K. Williams', label: 'AUCKLAND NETBALL', club: 'Auckland Central Netball', category: 'SPORTS PHYSIO', status: 'AVAILABLE', retainer: 50000, eastKm: -15.6, northKm: 1 }),
    ],
  }),
];

function registerById(id: string) {
  return REGISTERS.find((item) => item.id === id) ?? REGISTERS[0];
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let ringFrame = 0;

function animateSvgRadius(el: SVGCircleElement, to: number) {
  cancelAnimationFrame(ringFrame);
  const from = Number(el.getAttribute('r') || to);
  if (Math.abs(from - to) < 0.4 || prefersReducedMotion()) {
    el.setAttribute('r', String(to));
    return;
  }
  const start = performance.now();
  const duration = 720;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const ease = 1 - (1 - t) ** 3;
    el.setAttribute('r', String(from + (to - from) * ease));
    if (t < 1) ringFrame = requestAnimationFrame(tick);
  };
  ringFrame = requestAnimationFrame(tick);
}

function folioToScreen(eastKm: number, northKm: number, box: { w: number; h: number }) {
  const point = projectKm(eastKm, northKm);
  const scale = Math.max(box.w / VB_W, box.h / VB_H);
  const dispW = VB_W * scale;
  const dispH = VB_H * scale;
  return {
    x: (box.w - dispW) / 2 + point.x * scale,
    y: (box.h - dispH) / 2 + point.y * scale,
    scale,
  };
}

function screenCornerKm(sx: number, sy: number, box: { w: number; h: number }) {
  const scale = Math.max(box.w / VB_W, box.h / VB_H);
  const dispW = VB_W * scale;
  const dispH = VB_H * scale;
  const vx = (sx - (box.w - dispW) / 2) / scale;
  const vy = (sy - (box.h - dispH) / 2) / scale;
  return {
    eastKm: (vx / VB_W) * LNG_SPAN_KM - LNG_SPAN_KM / 2,
    northKm: TOP_NORTH_KM - (vy / VB_H) * LAT_SPAN_KM,
  };
}

function formatCorner(key: string, lat: number, lng: number) {
  return `${key} · ${Math.abs(lat).toFixed(4)}° S, ${Math.abs(lng).toFixed(4)}° E`;
}

function cornerLatLng(lat: number, lng: number, eastKm: number, northKm: number) {
  const latOut = lat + northKm / KM_PER_DEG;
  const lngOut = lng + eastKm / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180));
  return { lat: latOut, lng: lngOut };
}

function formatAud(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) return `$${rounded}`;
  return `$${rounded.toFixed(2)}`;
}

function splitRetainer(retainer: number) {
  return {
    athlete: Math.round(retainer * 70) / 100,
    club: Math.round(retainer * 15) / 100,
    escrow: Math.round(retainer * 15) / 100,
  };
}

function packageForRetainer(retainer: number): DeployPackageId {
  if (retainer >= 50000) return 'regional';
  if (retainer >= 3500) return 'metro';
  return 'storefront';
}

function grassrootsMark(club: string): string {
  return `15% TO ${club.replace(/\bAssociation\b/gi, 'ASSN').toUpperCase()}`;
}

function rulerCaption(km: number): string {
  if (km >= 50) return '50KM REGIONAL SYNDICATE';
  if (km >= 15) return '15KM DISTRICT CLUSTER';
  return '5KM CONCRETE FOOTPRINT';
}

function rulerStops(km: number): readonly { label: string; major: boolean }[] {
  const step = km / 5;
  return Array.from({ length: 6 }, (_, index) => ({
    label: `${Math.round(index * step)}km`,
    major: index === 0 || index === 5,
  }));
}

function DraftingCrosshairs({ w, h }: { w: number; h: number }) {
  if (w < 40 || h < 40) return null;
  const step = 120;
  const marks: { x: number; y: number }[] = [];
  for (let x = step; x < w; x += step) {
    for (let y = step; y < h; y += step) {
      marks.push({ x, y });
    }
  }
  return (
    <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full" aria-hidden="true">
      {marks.map((mark) => (
        <g key={`${mark.x}-${mark.y}`} className="stroke-neutral-800/20" strokeWidth="0.5">
          <line x1={mark.x - 5} y1={mark.y} x2={mark.x + 5} y2={mark.y} />
          <line x1={mark.x} y1={mark.y - 5} x2={mark.x} y2={mark.y + 5} />
        </g>
      ))}
    </svg>
  );
}

function CompassTicks({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  if (!Number.isFinite(r) || r < 18) return null;
  const marks = [
    { deg: '0°', angle: -Math.PI / 2 },
    { deg: '90°', angle: 0 },
    { deg: '180°', angle: Math.PI / 2 },
    { deg: '270°', angle: Math.PI },
  ] as const;
  return (
    <svg className="pointer-events-none absolute inset-0 z-[4] h-full w-full" aria-hidden="true">
      {marks.map((mark) => {
        const outerX = cx + Math.cos(mark.angle) * r;
        const outerY = cy + Math.sin(mark.angle) * r;
        const innerX = cx + Math.cos(mark.angle) * (r - 7);
        const innerY = cy + Math.sin(mark.angle) * (r - 7);
        const labelX = cx + Math.cos(mark.angle) * (r + 16);
        const labelY = cy + Math.sin(mark.angle) * (r + 16);
        return (
          <g key={mark.deg}>
            <line
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              className="stroke-neutral-800/40"
              strokeWidth="0.75"
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={SLATE}
              fillOpacity="0.42"
              fontSize="8"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              letterSpacing="0.12em"
            >
              {mark.deg}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DraftingTick({ label, className }: { label: string; className: string }) {
  const [key, coords = ''] = label.split(' · ');
  const [lat, lng] = coords.split(', ');
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 flex items-start gap-1.5 font-mono text-[9px] uppercase tracking-widest text-neutral-800/45 select-none ${className}`}
    >
      <span className="relative mt-px inline-flex h-3 w-3 shrink-0">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-800/45" />
        <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-neutral-800/45" />
      </span>
      <span className="leading-tight sm:hidden">
        <span className="block">{key}</span>
        <span className="mt-0.5 block tracking-normal">{lat}</span>
        {lng ? <span className="block tracking-normal">{lng}</span> : null}
      </span>
      <span className="hidden leading-none sm:inline">{label}</span>
    </div>
  );
}

export const RadialCatchment: React.FC = () => {
  const clipId = `cadastral-land-${useId().replace(/:/g, '')}`;
  const [registerId, setRegisterId] = useState<string>(REGISTERS[0].id);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [mode, setMode] = useState<CatchmentMode>('5km');
  const [activePinId, setActivePinId] = useState<string>(REGISTERS[0].pins[0].id);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const ringReady = useRef(false);

  const register = registerById(registerId);
  const active = modeById(mode);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return REGISTERS.filter((item) => `${item.suburb} ${item.postcode} ${item.region}`.toLowerCase().includes(q));
  }, [query]);

  const visiblePins = useMemo(
    () => register.pins.filter((item) => item.km <= active.km + 0.05),
    [register, active.km],
  );
  const selectedPin = visiblePins.find((item) => item.id === activePinId) ?? visiblePins[0] ?? register.pins[0];
  const split = splitRetainer(selectedPin.retainer);
  const categoryOpen = selectedPin.status === 'AVAILABLE' ? 'OPEN' : 'CLEARED';
  const titleOpen = selectedPin.status === 'AVAILABLE';
  const measured = box.w > 40 && box.h > 40;
  const anchor = folioToScreen(0, 0, box);
  const targetRadius = kmToViewRadius(active.km) * anchor.scale;

  const corners = useMemo(() => {
    if (box.w < 40 || box.h < 40) return [];
    const specs = [
      { key: 'NW', sx: 0, sy: 0, className: 'top-6 left-6' },
      { key: 'NE', sx: box.w, sy: 0, className: 'top-6 right-6 flex-row-reverse' },
      { key: 'SW', sx: 0, sy: box.h, className: 'left-6 bottom-6' },
      { key: 'SE', sx: box.w, sy: box.h, className: 'right-6 bottom-6 flex-row-reverse' },
    ] as const;
    return specs.map((corner) => {
      const km = screenCornerKm(corner.sx, corner.sy, box);
      const geo = cornerLatLng(register.lat, register.lng, km.eastKm, km.northKm);
      return {
        key: corner.key,
        className: corner.className,
        label: formatCorner(corner.key, geo.lat, geo.lng),
      };
    });
  }, [box, register.lat, register.lng]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestionsOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    if (visiblePins.some((item) => item.id === activePinId)) return;
    if (visiblePins[0]) setActivePinId(visiblePins[0].id);
  }, [activePinId, visiblePins]);

  useEffect(() => {
    const el = ringRef.current;
    if (!el || !measured || !Number.isFinite(targetRadius) || targetRadius <= 0) return undefined;
    el.setAttribute('cx', String(anchor.x));
    el.setAttribute('cy', String(anchor.y));
    if (!ringReady.current) {
      el.setAttribute('r', String(targetRadius));
      ringReady.current = true;
      return undefined;
    }
    animateSvgRadius(el, targetRadius);
    return () => cancelAnimationFrame(ringFrame);
  }, [targetRadius, anchor.x, anchor.y, measured]);

  const commitRegister = (id: string) => {
    const next = registerById(id);
    const flight = modeById(mode);
    const nextVisible = next.pins.filter((item) => item.km <= flight.km + 0.05);
    setRegisterId(next.id);
    setActivePinId((nextVisible[0] ?? next.pins[0]).id);
    setQuery('');
    setSuggestionsOpen(false);
  };

  const claimRights = () => {
    emitOverlayEvent(OPEN_DEPLOY_DRAWER_EVENT, { packageId: packageForRetainer(selectedPin.retainer) });
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setQuery('');
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (suggestions[0]) commitRegister(suggestions[0].id);
  };

  const water = register.waterLabel ? projectKm(register.waterLabel.eastKm, register.waterLabel.northKm) : null;

  return (
    <section
      id="catchment"
      aria-labelledby="catchment-heading"
      data-postcode={register.postcode}
      className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full my-24 scroll-mt-[74px] bg-transparent text-neutral-900"
    >
      <style>{`
        @keyframes cadastral-live {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(2.15); opacity: 0.12; }
        }
        @keyframes cadastral-pin-halo {
          0%, 100% { transform: scale(0.9); opacity: 0.72; }
          50% { transform: scale(1.8); opacity: 0.08; }
        }
        .cadastral-live-dot { animation: cadastral-live 2.2s ease-in-out infinite; }
        .cadastral-pin-halo { animation: cadastral-pin-halo 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cadastral-live-dot,
          .cadastral-pin-halo { animation: none; }
        }
      `}</style>

      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-neutral-400 mb-6">
        <span>CADASTRAL REGISTER · TERRITORIAL TITLE ENGINE</span>
        <span>POSTCODE ALLOCATION INDEX · AU & NZ</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pb-6 mb-6 border-b border-neutral-200">
        <div className="relative z-30 flex min-w-0 flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div ref={searchRef} className="relative">
              <label htmlFor="cadastral-postcode-search" className="sr-only">
                Search postcode or suburb
              </label>
              <input
                id="cadastral-postcode-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => {
                  if (query.trim()) setSuggestionsOpen(true);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="SEARCH POSTCODE"
                autoComplete="off"
                spellCheck={false}
                className="bg-neutral-100 border border-neutral-200 rounded-full px-4 py-2 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0F0F11] w-64 max-w-full"
              />
              {suggestionsOpen && query.trim() ? (
                <ul
                  role="listbox"
                  aria-label="Postcode matches"
                  className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg"
                >
                  {suggestions.length === 0 ? (
                    <li className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      No register match
                    </li>
                  ) : (
                    suggestions.map((item) => {
                      const current = item.id === register.id;
                      return (
                        <li key={item.id} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={current}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => commitRegister(item.id)}
                            className="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-2.5 text-left font-mono text-xs uppercase tracking-wide text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                          >
                            <span>
                              {item.suburb} {item.postcode}
                              {current ? ' (Active)' : ''}
                            </span>
                            <span className="text-[10px] text-neutral-400">{item.region}</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </div>

            <label className="relative inline-flex items-center">
              <span className="sr-only">Postcode presets</span>
              <select
                aria-label="Postcode presets"
                value={register.id}
                onChange={(event) => commitRegister(event.target.value)}
                className="bg-neutral-100 border border-neutral-200 rounded-full pl-4 pr-9 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#0F0F11] cursor-pointer appearance-none min-w-[15.5rem]"
              >
                {REGISTERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.suburb} {item.postcode}
                    {item.id === register.id ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-neutral-500"
                strokeWidth={1.75}
              />
            </label>
          </div>

          <p className="m-0 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500" aria-live="polite">
            <span className="relative flex h-[6px] w-[6px] shrink-0" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00] cadastral-live-dot" />
              <span className="relative h-[6px] w-[6px] rounded-full bg-[#CCFF00]" />
            </span>
            SHOWING {visiblePins.length} VERIFIED CONTENDERS · TERRITORIAL TITLE OPEN
          </p>
        </div>

        <div
          role="group"
          aria-label="Catchment radius"
          className="bg-neutral-100 p-1 rounded-full border border-neutral-200 inline-flex flex-wrap gap-1 self-start md:self-auto"
        >
          {MODES.map((item) => {
            const selected = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={selected}
                className={
                  selected
                    ? 'bg-[#0F0F11] text-white font-mono text-xs px-4 py-1.5 rounded-full font-medium transition-all shadow-sm border-0 cursor-pointer'
                    : 'text-neutral-600 hover:text-[#0F0F11] font-mono text-xs px-4 py-1.5 rounded-full cursor-pointer transition-all bg-transparent border-0'
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="w-full h-[500px] lg:h-[560px] bg-[#DCE5DC] rounded-[28px] border border-neutral-300 relative overflow-hidden shadow-sm p-6 sm:p-8 flex flex-col justify-between select-none mb-8"
      >
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          >
            <rect width={VB_W} height={VB_H} fill={LICHEN} />
            <defs>
              <clipPath id={clipId}>
                <path d={register.land} />
              </clipPath>
            </defs>
            <path d={register.land} fill={CHALK} />
            {register.waterways ? (
              <g clipPath={`url(#${clipId})`}>
                <path
                  d={register.waterways}
                  fill="none"
                  stroke={LICHEN}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </svg>

          <p className="pointer-events-none absolute inset-0 z-[1] m-0 flex items-center justify-center px-4 text-center text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-neutral-900/10 uppercase select-none leading-none whitespace-nowrap">
            POSTCODE {register.postcode} · {register.region}
          </p>

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
          >
            <defs>
              <clipPath id={`${clipId}-grid`}>
                <path d={register.land} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId}-grid)`}>
              <path d={register.parcels} fill="none" className="stroke-neutral-800/15" strokeWidth="0.5" />
              <path
                d={register.streets}
                fill="none"
                className="stroke-neutral-800/15"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={register.arterials}
                fill="none"
                className="stroke-neutral-800/15"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <path
              d={register.land}
              fill="none"
              className="stroke-neutral-800/30"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {water && register.waterLabel ? (
              <text
                x={water.x}
                y={water.y}
                fill={SLATE}
                fillOpacity="0.38"
                fontSize="15"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                letterSpacing="3.5"
                textAnchor="middle"
              >
                {register.waterLabel.text}
              </text>
            ) : null}
          </svg>

          <DraftingCrosshairs w={box.w} h={box.h} />

          <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full" aria-hidden="true">
            <circle
              ref={ringRef}
              cx={measured ? anchor.x : 0}
              cy={measured ? anchor.y : 0}
              fill={VOLT}
              fillOpacity="0.12"
              stroke={VOLT}
              strokeWidth="1.5"
            />
          </svg>

          {measured ? <CompassTicks cx={anchor.x} cy={anchor.y} r={targetRadius} /> : null}

          {corners.map((corner) => (
            <DraftingTick key={corner.key} label={corner.label} className={corner.className} />
          ))}

          {measured
            ? visiblePins.map((item) => {
                const point = folioToScreen(item.eastKm, item.northKm, box);
                const onSheet = point.x > 16 && point.x < box.w - 16 && point.y > 16 && point.y < box.h - 16;
                if (!onSheet) return null;
                const isActive = item.id === selectedPin.id;
                const tooltipBelow = point.y < 88;
                const tooltipAlign =
                  point.x < 170 ? 'left-1/2' : point.x > box.w - 170 ? 'right-1/2' : 'left-1/2 -translate-x-1/2';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePinId(item.id)}
                    aria-label={`${item.contender}. ${item.label}. ${item.category}: ${item.status}. 15% routed to ${item.club}.`}
                    aria-pressed={isActive}
                    className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-2"
                    style={{ left: point.x, top: point.y }}
                  >
                    <span
                      className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-md bg-[#0F0F11] px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipAlign} ${
                        tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                      }`}
                    >
                      {item.contender} · {item.label}
                    </span>
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span
                        aria-hidden="true"
                        className={`cadastral-pin-halo absolute -inset-2 rounded-full bg-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.8)] ${
                          isActive ? 'opacity-90' : ''
                        }`}
                      />
                      <span
                        aria-hidden="true"
                        className={`relative h-3 w-3 rounded-full bg-[#0F0F11] ${
                          isActive ? 'ring-2 ring-[#CCFF00] ring-offset-2 ring-offset-white' : ''
                        }`}
                      />
                    </span>
                  </button>
                );
              })
            : null}

        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <article className="lg:col-span-6 bg-[#0A2818] text-white rounded-[28px] p-8 md:p-10 flex flex-col justify-between shadow-2xl min-h-[460px] border border-[#143D26] relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#CCFF00] text-[#0A2818] font-mono font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                  TERRITORIAL TITLE
                </span>
                <span className="bg-white/10 text-white font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                  ZERO TALENT AGENCY COMMISSIONS
                </span>
              </div>
              <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                FOLIO · {register.postcode}
              </span>
            </div>
            <h2
              id="catchment-heading"
              className="m-0 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter uppercase text-white leading-[1.02] mt-4"
            >
              COMMERCIAL PROVENANCE IS NOT NATIONAL. IT IS SUBURBAN.
            </h2>
            <p className="m-0 text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans mt-4 max-w-xl pr-24">
              Global federations claim contenders once they hit the podium. Suburban communities fund them in the dark. An
              emerging athlete commands absolute commercial loyalty across the five-kilometre radius of concrete where they
              live, train, and eat. tmrw/. clears first-right commercial title for your postcode before the world arrives.
              One brand per category. Direct to athlete under audited 70/15/15 escrow.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-[#CCFF00] text-black border-2 border-black/20 flex flex-col items-center justify-center text-center p-2 shadow-xl rotate-[-6deg] select-none pointer-events-none"
          >
            <span className="font-mono font-black text-[9px] uppercase leading-none tracking-tight">AUDITED</span>
            <span className="font-mono font-black text-sm uppercase leading-tight tracking-tighter my-0.5">70/15/15</span>
            <span className="font-mono font-bold text-[7px] uppercase leading-none tracking-widest text-neutral-800">ESCROW</span>
          </div>
          <div className="text-[11px] font-mono uppercase text-white/50 mt-6 pr-24">
            <span>ACTIVE REGION · POSTCODE {register.postcode}</span>
          </div>
        </article>

        <article
          aria-live="polite"
          className="lg:col-span-6 bg-[#FCFDFC] text-[#0F0F11] rounded-[28px] p-8 md:p-10 flex flex-col justify-between shadow-lg min-h-[460px] border border-neutral-300 relative overflow-hidden"
        >
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-neutral-200 pb-4 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-medium">
                PARCEL {selectedPin.parcel} · {register.suburb.toUpperCase()} {register.postcode}
              </span>
              <span
                className={
                  titleOpen
                    ? 'text-[#0F0F11] bg-[#CCFF00] px-3 py-1 rounded-full font-mono font-bold text-[10px] tracking-wider border border-black/10'
                    : 'text-neutral-700 bg-white px-3 py-1 rounded-full font-mono font-bold text-[10px] tracking-wider border border-neutral-200'
                }
              >
                {titleOpen ? 'AVAILABLE FOR CLAIM' : 'TITLE CLEARED'}
              </span>
            </div>
            <p className="m-0 text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#0F0F11] mt-1">
              {selectedPin.contender}
            </p>
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4 block">
              {selectedPin.label}
            </span>
            <div className="border-y border-neutral-200 py-3 my-2 w-full font-mono text-[10px] uppercase text-neutral-500">
              <div className="flex justify-between mb-1 text-neutral-500">
                <span>TERRITORIAL SCALE</span>
                <span className="font-bold text-[#0F0F11]">{rulerCaption(active.km)}</span>
              </div>
              <div className="relative h-3 flex justify-between items-end">
                {rulerStops(active.km).map((stop, index) => (
                  <span
                    key={stop.label}
                    className={
                      index === 5
                        ? 'border-l-2 border-[#CCFF00] h-3'
                        : stop.major
                          ? 'border-l-2 border-[#0F0F11] h-3'
                          : 'border-l border-neutral-300 h-2'
                    }
                    title={stop.label}
                  />
                ))}
              </div>
            </div>
            <div className="w-full space-y-2.5 py-3 border-b border-neutral-200 text-xs font-mono uppercase">
              <div className="flex justify-between">
                <span className="text-neutral-500">CATEGORY EXCLUSIVITY</span>
                <span className="font-bold text-[#0F0F11] text-right">
                  {selectedPin.category} · {categoryOpen}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">GRASSROOTS DIVIDEND</span>
                <span className="font-bold text-[#0F0F11] text-right">{grassrootsMark(selectedPin.club)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">MONTHLY COMMERCIAL RETAINER</span>
                  <span className="text-3xl font-bold tracking-tighter text-[#0F0F11]">
                    {formatAud(selectedPin.retainer)} / MONTH
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">AUDITED CLEARING SCHEDULE</span>
                  <span className="text-[11px] font-mono text-neutral-800 font-semibold">
                    {formatAud(split.athlete)} Athlete · {formatAud(split.club)} Club · {formatAud(split.escrow)} Escrow
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={claimRights}
            className="w-full bg-[#0F0F11] hover:bg-neutral-800 text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer mt-4 block shadow-md hover:shadow-lg"
          >
            CLAIM EXCLUSIVE POSTCODE RIGHTS →
          </button>
        </article>
      </div>
    </section>
  );
};

export default RadialCatchment;
