/**
 * TwelveLabs AI Media Studio service shell.
 * Mock handlers for vertical highlight generation and sponsor exposure search.
 * When VITE_TWELVELABS_API_KEY is configured, real API calls can be wired in;
 * until then these return realistic demo data after a short delay.
 */

import type { Athlete } from '../types';
import { lastName } from '../lib/formatName';

export interface HighlightClip {
  id: string;
  title: string;
  action: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  aspectRatio: '9:16';
  thumbnailGradient: string;
  sponsorWatermark: string;
  downloadUrl: string;
  confidence: number;
}

export interface SponsorExposure {
  id: string;
  timestamp: string;
  startSec: number;
  durationSec: number;
  context: string;
  visibilityScore: number;
}

export interface SponsorExposureResult {
  brandName: string;
  exposures: SponsorExposure[];
  totalExposureSec: number;
  videoDurationSec: number;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sportActions(sport: string | null): { action: string; title: string }[] {
  const s = (sport ?? '').toLowerCase();
  if (s.includes('rugby')) {
    return [
      { action: 'Try Scored', title: 'Match-Winning Try' },
      { action: 'Line Break', title: '30m Line Break' },
      { action: 'Big Tackle', title: 'Dominant Defensive Hit' },
    ];
  }
  if (s.includes('basketball')) {
    return [
      { action: '3-Pointer', title: 'Downtown Three' },
      { action: 'Slam Dunk', title: 'Posterizing Dunk' },
      { action: 'Fast Break', title: 'Coast-to-Coast Layup' },
    ];
  }
  if (s.includes('soccer')) {
    return [
      { action: 'Match Winning Goal', title: 'Top Corner Strike' },
      { action: 'Assist', title: 'Cross & Finish' },
      { action: 'Tackle', title: 'Recovery Tackle' },
    ];
  }
  if (s.includes('cricket')) {
    return [
      { action: 'Six', title: 'Maximum Over the Rope' },
      { action: 'Wicket', title: 'Bowled Him!' },
      { action: 'Catch', title: 'Diving Catch' },
    ];
  }
  return [
    { action: 'Score', title: 'Key Offensive Play' },
    { action: 'Defensive Stop', title: 'Crucial Defensive Play' },
    { action: 'Breakthrough', title: 'Game-Changing Run' },
  ];
}

const GRADIENTS = [
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
];

/**
 * Generate 3 vertical 9:16 highlight clips from an indexed video.
 * Returns clips with timestamps, detected actions, and sponsor watermarks.
 */
export async function generateAthleteHighlights(
  videoId: string,
  athlete?: Athlete
): Promise<HighlightClip[]> {
  await delay(1400);
  const actions = sportActions(athlete?.sport ?? null);
  const name = lastName(athlete?.name);
  const watermark = athlete?.current_club ? `${athlete.current_club} × SponsorMatch` : 'SponsorMatch';

  return actions.map((a, i) => {
    const start = [138, 462, 862][i] ?? 200 + i * 300;
    const duration = 12 + i * 3;
    return {
      id: `clip-${videoId}-${i}`,
      title: `${a.title} — ${name}`,
      action: a.action,
      startSec: start,
      endSec: start + duration,
      durationSec: duration,
      aspectRatio: '9:16',
      thumbnailGradient: GRADIENTS[i % GRADIENTS.length],
      sponsorWatermark: watermark,
      downloadUrl: `https://cdn.sponsormatch.app/highlights/${videoId}/clip-${i + 1}.mp4`,
      confidence: 0.85 + Math.random() * 0.12,
    };
  });
}

/**
 * Search the TwelveLabs index for visual logo appearances of a sponsor brand.
 * Returns timestamp log + total exposure duration.
 */
export async function searchSponsorExposures(
  brandName: string,
  videoDurationSec = 3600
): Promise<SponsorExposureResult> {
  await delay(1200);
  const baseTimestamps = [252, 750, 1215, 1720, 2210, 2880];
  const contexts = [
    'Banner visible behind play',
    'Logo on jersey during replay',
    'Sideline signage in frame',
    'Post-match interview backdrop',
    'Stadium big screen display',
    'Halftime segment overlay',
  ];

  const exposures: SponsorExposure[] = baseTimestamps.map((ts, i) => {
    const dur = 5 + Math.floor(Math.random() * 10);
    const m = Math.floor(ts / 60);
    const s = ts % 60;
    return {
      id: `exp-${i}`,
      timestamp: `${m}:${s.toString().padStart(2, '0')}`,
      startSec: ts,
      durationSec: dur,
      context: contexts[i],
      visibilityScore: 0.6 + Math.random() * 0.35,
    };
  });

  const total = exposures.reduce((sum, e) => sum + e.durationSec, 0);

  return {
    brandName,
    exposures,
    totalExposureSec: total,
    videoDurationSec,
  };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
