/**
 * TwelveLabs video ingestion & indexing client.
 * Initializes the API client from VITE_TWELVELABS_API_KEY and exposes
 * utilities to upload match footage, create an index, and retrieve
 * structured timestamp payloads for detected key player events.
 */

import type { Athlete } from '../types';

const API_BASE = 'https://api.twelvelabs.io/v1.3';

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

function getApiKey(): string {
  const key = import.meta.env.VITE_TWELVELABS_API_KEY;
  if (!key) throw new Error('VITE_TWELVELABS_API_KEY is not configured');
  return key;
}

export function isTwelveLabsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_TWELVELABS_API_KEY);
}

async function twelveLabsFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const key = getApiKey();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
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
    const body = await res.text();
    throw new Error(`Failed to create TwelveLabs index: ${body}`);
  }
  const data = await res.json();
  return data._id as string;
}

/**
 * Upload match footage to a TwelveLabs index. The file is sent as a
 * multipart form upload to the /uploads endpoint.
 */
export async function uploadVideo(
  indexId: string,
  file: File,
  onProgress?: (p: IngestionProgress) => void
): Promise<string> {
  onProgress?.({ phase: 'uploading', message: `Uploading ${file.name}…`, progress: 10 });

  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_file', file);

  const key = getApiKey();
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: { 'x-api-key': key },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${body}`);
  }

  const data = await res.json();
  const videoId = data._id as string;

  onProgress?.({ phase: 'uploading', message: 'Upload complete', progress: 30 });
  return videoId;
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

  while (Date.now() - start < maxWaitMs) {
    const res = await twelveLabsFetch(`/indexes/${indexId}/videos/${videoId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.system_metadata?.status === 'ready' || data.system_metadata?.ready === true) {
        onProgress?.({ phase: 'indexing', message: 'Index ready', progress: 60 });
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
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

  for (const { prompt, type } of prompts) {
    const res = await twelveLabsFetch(`/search`, {
      method: 'POST',
      body: JSON.stringify({
        index_id: indexId,
        query: prompt,
        search_options: ['visual', 'audio'],
      }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const clips = data.clips ?? data.data ?? [];

    for (const clip of clips) {
      const start = clip.start ?? clip.start_sec ?? 0;
      const end = clip.end ?? clip.end_sec ?? start + 5;
      const text = clip.text ?? clip.description ?? prompt;
      const confidence = clip.confidence ?? clip.score ?? 0.5;

      allEvents.push({
        start: typeof start === 'number' ? start : parseFloat(start),
        end: typeof end === 'number' ? end : parseFloat(end),
        text,
        confidence,
        type,
      });
    }
  }

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
  const sport = (athlete.sport ?? '').toLowerCase();
  const name = athlete.name.split(' ').slice(-1)[0] ?? athlete.name;

  if (sport.includes('rugby')) {
    return [
      { start: 194, end: 210, text: `Big hit by ${name} — dominant tackle`, confidence: 0.92, type: 'tackle' },
      { start: 462, end: 485, text: `Line break by ${name} — 30m run`, confidence: 0.88, type: 'linebreak' },
      { start: 862, end: 890, text: `Line break and try at 14:22 — ${name} scores`, confidence: 0.95, type: 'try' },
      { start: 1085, end: 1100, text: `Conversion kick — ${name} adds the extras`, confidence: 0.84, type: 'kick' },
      { start: 1470, end: 1495, text: `Defensive read — ${name} intercepts pass`, confidence: 0.79, type: 'tackle' },
      { start: 1878, end: 1910, text: `Second try — ${name} crashes over from 5m`, confidence: 0.93, type: 'try' },
    ];
  }

  if (sport.includes('basketball')) {
    return [
      { start: 138, end: 150, text: `Three-pointer — ${name} from downtown`, confidence: 0.91, type: 'kick' },
      { start: 344, end: 365, text: `Fast break layup by ${name}`, confidence: 0.87, type: 'linebreak' },
      { start: 552, end: 575, text: `Block by ${name} — rejected at the rim`, confidence: 0.85, type: 'tackle' },
      { start: 862, end: 890, text: `And-one! ${name} scores through contact`, confidence: 0.93, type: 'try' },
      { start: 1290, end: 1320, text: `Steal and coast-to-coast — ${name} finishes`, confidence: 0.89, type: 'linebreak' },
    ];
  }

  return [
    { start: 252, end: 270, text: `Key moment — ${name} breaks through`, confidence: 0.82, type: 'linebreak' },
    { start: 750, end: 780, text: `Score by ${name}`, confidence: 0.88, type: 'try' },
    { start: 1215, end: 1240, text: `Defensive play by ${name}`, confidence: 0.76, type: 'tackle' },
    { start: 1720, end: 1745, text: `Precision strike — ${name} delivers`, confidence: 0.84, type: 'kick' },
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
