import express from 'express';
import { requireUser } from './auth.js';

const API_BASE = 'https://api.twelvelabs.io/v1.3';
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function createTwelveLabsRouter() {
  const router = express.Router();
  let warnedLegacy = false;
  router.use((_req, res, next) => {
    const key = process.env.TWELVELABS_API_KEY || process.env.VITE_TWELVELABS_API_KEY;
    if (!key) return res.status(503).json({ error: 'TwelveLabs is not configured', configured: false });
    if (!process.env.TWELVELABS_API_KEY && !warnedLegacy) {
      console.warn('[twelvelabs] VITE_TWELVELABS_API_KEY is deprecated; use server-only TWELVELABS_API_KEY.');
      warnedLegacy = true;
    }
    res.locals.apiKey = key;
    next();
  });
  router.get('/status', (_req, res) => res.json({ configured: true }));
  const usage = new Map();
  router.use(requireUser, (req, res, next) => {
    const now = Date.now();
    for (const [id, entry] of usage) if (entry.until <= now) usage.delete(id);
    const entry = usage.get(req.authUser.id) || { count: 0, until: now + 60000 };
    usage.set(req.authUser.id, entry);
    if (++entry.count > 60) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ error: 'Video analysis rate limit exceeded' });
    }
    next();
  });
  router.use(express.json({ limit: '64kb' }));

  async function upstream(res, path, options, project) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: AbortSignal.timeout(10000),
        headers: { ...options.headers, 'x-api-key': res.locals.apiKey },
      });
      if (!response.ok) return res.status(response.status === 429 ? 429 : response.status >= 500 || response.status === 401 || response.status === 403 ? 502 : 400).json({ error: 'TwelveLabs request failed' });
      const data = await response.json();
      const safeJson = JSON.stringify(project(data)).split(res.locals.apiKey).join('[redacted]');
      return res.type('json').send(safeJson);
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      return res.status(timeout ? 504 : 502).json({
        error: timeout ? 'TwelveLabs request timed out' : 'TwelveLabs request failed',
      });
    }
  }
  const identifier = (data) => {
    if (!validId(data?._id)) throw new Error('Invalid upstream identifier');
    return { _id: data._id };
  };
  router.post('/indexes', (req, res) => {
    if (!validText(req.body?.index_name, 200)) return res.status(400).json({ error: 'A valid index_name is required' });
    return upstream(res, '/indexes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index_name: req.body.index_name.trim(),
        models: [{ model_name: 'marengo2.7', model_options: ['visual', 'audio'] }],
      }),
    }, identifier);
  });
  router.post('/uploads', express.raw({ type: ['video/*', 'application/octet-stream'], limit: '4mb' }), (req, res) => {
    if (!validId(req.query.index_id) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'A valid index_id and non-empty video body are required (maximum 4 MiB)' });
    }
    const form = new FormData();
    form.append('index_id', req.query.index_id);
    form.append('video_file', new Blob([req.body], { type: req.get('Content-Type') || 'application/octet-stream' }), 'footage.mp4');
    return upstream(res, '/uploads', { method: 'POST', body: form }, identifier);
  });
  router.get('/indexes/:indexId/videos/:videoId', (req, res) => {
    const { indexId, videoId } = req.params;
    if (!validId(indexId) || !validId(videoId)) return res.status(400).json({ error: 'Invalid index or video identifier' });
    return upstream(res, `/indexes/${indexId}/videos/${videoId}`, { method: 'GET' }, (data) => ({
      system_metadata: {
        status: data?.system_metadata?.status === 'ready' ? 'ready' : 'pending',
        ready: data?.system_metadata?.ready === true,
      },
    }));
  });
  router.post('/search', (req, res) => {
    if (!validId(req.body?.index_id) || !validText(req.body?.query, 2000)) {
      return res.status(400).json({ error: 'A valid index_id and query are required' });
    }
    return upstream(res, '/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index_id: req.body.index_id, query: req.body.query.trim(), search_options: ['visual', 'audio'] }),
    }, (data) => {
      const clips = data?.clips ?? data?.data;
      if (!Array.isArray(clips)) throw new Error('Invalid upstream search result');
      return { clips: clips.slice(0, 1000).map((clip) => ({
        start: Number(clip.start ?? clip.start_sec ?? 0),
        end: Number(clip.end ?? clip.end_sec ?? 0),
        text: String(clip.text ?? clip.description ?? '').slice(0, 2000),
        confidence: Number(clip.confidence ?? clip.score ?? 0.5),
      })) };
    });
  });
  return router;
}
