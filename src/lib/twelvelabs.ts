/** TwelveLabs ingestion through the server proxy, with local sample fallbacks. */

import type { Athlete } from '../types';
import { lastName } from './formatName';
import { currentAccessToken } from './sessionToken';

const API_BASE = '/api/twelvelabs';

export interface TwelveLabsEvent {
  start: number;
  end: number;
  text: string;
  confidence: number;
  type: 'try' | 'linebreak' | 'tackle' | 'kick' | 'general';
}

export interface TwelveLabsIndexResult {
  indexId: string;
  videoId: string;
  status: 'pending' | 'ready' | 'failed';
  events: TwelveLabsEvent[];
  durationSeconds: number;
}

export interface IngestionProgress {
  phase: 'uploading' | 'indexing' | 'detecting' | 'complete' | 'error';
  message: string;
  progress: number;
}

export async function isTwelveLabsConfigured(): Promise<boolean> {
  try {
    const response = await twelveLabsFetch('/status');
    return response.ok && (await response.json()).configured === true;
  } catch {
    return false;
  }
}

async function twelveLabsFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const signal = options.signal ?? AbortSignal.timeout(10000);
  const token = await currentAccessToken(signal);
  if (!token) return new Response(null, { status: 401 });
  return fetch(`${API_BASE}${path}`, {
    ...options,
    signal,
    headers: { 'Content-Type': 'application/json', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

/**
 * Create a TwelveLabs index for ingesting match footage.
 * Returns the index ID to associate with subsequent video uploads.
 */
export async function createIndex(indexName: string): Promise<string> {
  const res = await twelveLabsFetch('/indexes', {
    method: 'POST',
    body: JSON.stringify({
      index_name: indexName,
      models: [
        {
          model_name: 'marengo2.7',
          model_options: ['visual', 'audio'],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error('Video analysis unavailable · using sample data');
  }
  const data = await res.json();
  return data._id as string;
}

/**
 * Upload a small video to the proxy, which creates the upstream multipart body.
 */
function validateVideo(file: File) {
  const videoType = file.type.startsWith('video/') || (!file.type && /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name));
  if (!file.size || file.size > 4 * 1024 * 1024 || !videoType) {
    throw new Error('Choose a video up to 4 MiB · larger footage uses sample analysis');
  }
}

export async function uploadVideo(indexId: string, file: File, onProgress?: (p: IngestionProgress) => void): Promise<string> {
  validateVideo(file);
  onProgress?.({ phase: 'uploading', message: 'Uploading footage…', progress: 10 });
  const res = await twelveLabsFetch(`/uploads?index_id=${encodeURIComponent(indexId)}`, {
    method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file,
  });
  if (!res.ok) throw new Error('Video upload unavailable · using sample data');
  return (await res.json())._id as string;
}

/**
 * Poll the TwelveLabs index until the video is ready for search.
 */
export async function waitForIndexReady(
  indexId: string,
  videoId: string,
  onProgress?: (p: IngestionProgress) => void,
  maxWaitMs = 120000
): Promise<void> {
  const start = Date.now();
  onProgress?.({ phase: 'indexing', message: 'Indexing video…', progress: 40 });

  let failures = 0;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await twelveLabsFetch(`/indexes/${encodeURIComponent(indexId)}/videos/${encodeURIComponent(videoId)}`, {
        signal: AbortSignal.timeout(Math.max(1, Math.min(10000, maxWaitMs - (Date.now() - start)))),
      });
      if (!res.ok && res.status !== 429 && res.status < 500) throw new Error('Permanent video indexing failure');
      if (res.ok) {
        failures = 0;
        const data = await res.json();
        if (data.system_metadata?.status === 'ready' || data.system_metadata?.ready === true) {
          onProgress?.({ phase: 'indexing', message: 'Index ready', progress: 60 });
          return;
        }
      } else failures++;
    } catch (error) {
      if (error instanceof Error && error.message === 'Permanent video indexing failure') throw error;
      failures++;
    }
    const pause = Math.min(failures ? 500 * 2 ** Math.min(failures - 1, 4) : 3000, maxWaitMs - (Date.now() - start));
    if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  }

  throw new Error('Video indexing timed out');
}

/**
 * Query the TwelveLabs index for key player events. Uses sport-specific
 * search prompts to detect line breaks, tries, blocks, tackles, and kicks.
 */
export async function detectKeyEvents(
  indexId: string,
  _videoId: string,
  sport: string,
  onProgress?: (p: IngestionProgress) => void
): Promise<TwelveLabsEvent[]> {
  onProgress?.({ phase: 'detecting', message: 'Detecting key events…', progress: 70 });

  const prompts = getSportSearchPrompts(sport);
  const allEvents: TwelveLabsEvent[] = [];

  const search = async ({ prompt, type }: SportPrompt): Promise<TwelveLabsEvent[]> => {
    const res = await twelveLabsFetch(`/search`, {
      method: 'POST',
      body: JSON.stringify({
        index_id: indexId,
        query: prompt,
        search_options: ['visual', 'audio'],
      }),
    });

    if (!res.ok) throw new Error('Video search unavailable · using sample data');

    const data = await res.json();
    const clips = data.clips ?? data.data ?? [];

    return clips.map((clip: Record<string, string | number>) => {
      const start = Number(clip.start ?? clip.start_sec ?? 0);
      const end = Number(clip.end ?? clip.end_sec ?? start + 5);
      const text = clip.text ?? clip.description ?? prompt;
      const confidence = Number(clip.confidence ?? clip.score ?? 0.5);

      return {
        start,
        end,
        text: String(text),
        confidence,
        type,
      };
    });
  };
  let successes = 0;
  for (let offset = 0; offset < prompts.length; offset += 2) {
    const results = await Promise.allSettled(prompts.slice(offset, offset + 2).map(search));
    for (const result of results) if (result.status === 'fulfilled') {
      successes++;
      allEvents.push(...result.value);
    }
  }
  if (!successes) throw new Error('Video search unavailable · using sample data');

  allEvents.sort((a, b) => a.start - b.start);
  onProgress?.({ phase: 'detecting', message: 'Event detection complete', progress: 90 });
  return allEvents;
}

interface SportPrompt {
  prompt: string;
  type: TwelveLabsEvent['type'];
}

function getSportSearchPrompts(sport: string): SportPrompt[] {
  const s = sport.toLowerCase();

  if (s.includes('rugby')) {
    return [
      { prompt: 'player scores a try', type: 'try' },
      { prompt: 'player breaks through the defensive line', type: 'linebreak' },
      { prompt: 'player makes a big tackle', type: 'tackle' },
      { prompt: 'player kicks the ball', type: 'kick' },
    ];
  }

  if (s.includes('basketball')) {
    return [
      { prompt: 'player scores a basket', type: 'try' },
      { prompt: 'player fast break', type: 'linebreak' },
      { prompt: 'player blocks a shot', type: 'tackle' },
      { prompt: 'player shoots a three pointer', type: 'kick' },
    ];
  }

  return [
    { prompt: 'player scores', type: 'try' },
    { prompt: 'player breaks through', type: 'linebreak' },
    { prompt: 'player defensive play', type: 'tackle' },
    { prompt: 'player strikes or kicks', type: 'kick' },
  ];
}

/**
 * Full ingestion pipeline: create index, upload video, wait for readiness,
 * detect key events, and return a structured result.
 */
export async function ingestMatchFootage(
  file: File,
  athlete: Athlete,
  onProgress?: (p: IngestionProgress) => void
): Promise<TwelveLabsIndexResult> {
  validateVideo(file);
  const indexName = `athlete-${athlete.id}-${Date.now()}`;
  const indexId = await createIndex(indexName);
  const videoId = await uploadVideo(indexId, file, onProgress);
  await waitForIndexReady(indexId, videoId, onProgress);
  const events = await detectKeyEvents(indexId, videoId, athlete.sport ?? '', onProgress);

  onProgress?.({ phase: 'complete', message: 'Processing complete', progress: 100 });

  return {
    indexId,
    videoId,
    status: 'ready',
    events,
    durationSeconds: events.length > 0 ? events[events.length - 1].end : 0,
  };
}

/* ---------- Fallback Mock Parser ---------- */

/**
 * Generates realistic mock event data when TwelveLabs is not configured
 * or processing is delayed. Produces sport-appropriate timestamps and
 * labels so the Brand Kit UI remains fully functional for demos.
 */
export function generateMockEvents(athlete: Athlete): TwelveLabsEvent[] {
  const sport = (athlete?.sport ?? '').toLowerCase();
  const name = lastName(athlete?.name);

  if (sport.includes('rugby')) {
    return [
      { start: 194, end: 210, text: `Big hit by ${name} · dominant tackle`, confidence: 0.92, type: 'tackle' },
      { start: 462, end: 485, text: `Line break by ${name} · 30m run`, confidence: 0.88, type: 'linebreak' },
      { start: 862, end: 890, text: `Line break and try at 14:22 · ${name} scores`, confidence: 0.95, type: 'try' },
      { start: 1085, end: 1100, text: `Conversion kick · ${name} adds the extras`, confidence: 0.84, type: 'kick' },
      { start: 1470, end: 1495, text: `Defensive read · ${name} intercepts pass`, confidence: 0.79, type: 'tackle' },
      { start: 1878, end: 1910, text: `Second try · ${name} crashes over from 5m`, confidence: 0.93, type: 'try' },
    ];
  }

  if (sport.includes('basketball')) {
    return [
      { start: 138, end: 150, text: `Three-pointer · ${name} from downtown`, confidence: 0.91, type: 'kick' },
      { start: 344, end: 365, text: `Fast break layup by ${name}`, confidence: 0.87, type: 'linebreak' },
      { start: 552, end: 575, text: `Block by ${name} · rejected at the rim`, confidence: 0.85, type: 'tackle' },
      { start: 862, end: 890, text: `And-one! ${name} scores through contact`, confidence: 0.93, type: 'try' },
      { start: 1290, end: 1320, text: `Steal and coast-to-coast · ${name} finishes`, confidence: 0.89, type: 'linebreak' },
    ];
  }

  return [
    { start: 252, end: 270, text: `Key moment · ${name} breaks through`, confidence: 0.82, type: 'linebreak' },
    { start: 750, end: 780, text: `Score by ${name}`, confidence: 0.88, type: 'try' },
    { start: 1215, end: 1240, text: `Defensive play by ${name}`, confidence: 0.76, type: 'tackle' },
    { start: 1720, end: 1745, text: `Precision strike · ${name} delivers`, confidence: 0.84, type: 'kick' },
  ];
}

/**
 * Simulated ingestion pipeline for the fallback path. Returns mock events
 * after a short delay to mimic processing, with progress callbacks.
 */
export async function ingestMockFootage(
  athlete: Athlete,
  onProgress?: (p: IngestionProgress) => void
): Promise<TwelveLabsIndexResult> {
  onProgress?.({ phase: 'uploading', message: 'Uploading sample footage…', progress: 15 });
  await delay(600);

  onProgress?.({ phase: 'indexing', message: 'Indexing video frames…', progress: 45 });
  await delay(800);

  onProgress?.({ phase: 'detecting', message: 'Detecting key events…', progress: 75 });
  await delay(700);

  const events = generateMockEvents(athlete);
  onProgress?.({ phase: 'complete', message: 'Processing complete', progress: 100 });

  return {
    indexId: `mock-${athlete.id}-${Date.now()}`,
    videoId: `mock-video-${Date.now()}`,
    status: 'ready',
    events,
    durationSeconds: events.length > 0 ? events[events.length - 1].end : 0,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- Timestamp formatting ---------- */

export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
