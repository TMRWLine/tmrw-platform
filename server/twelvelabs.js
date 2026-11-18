import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireUser } from './auth.js';

const API_BASE = 'https://api.twelvelabs.io/v1.3';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function indexSignature(indexId, userId, key) {
  return createHmac('sha256', key).update(JSON.stringify(['tmrw-index-v1', userId, indexId])).digest('base64url');
}

function ownedIndex(req, res, handle) {
  const match = typeof handle === 'string' && /^([a-zA-Z0-9_-]{1,128})\.([a-zA-Z0-9_-]{43})$/.exec(handle);
  if (!match || !timingSafeEqual(Buffer.from(match[2]), Buffer.from(indexSignature(match[1], req.authUser.id, res.locals.apiKey)))) {
    res.status(403).json({ error: 'Video index access denied' });
    return null;
  }
  return match[1];
}

export function createTwelveLabsRouter({ clientLimit = 120, providerLimit = 300 } = {}) {
  const router = express.Router();
  const clients = new Map();
  const users = new Map();
  let until = 0;
  let providerRequests = 0;
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const key = process.env.TWELVELABS_API_KEY?.trim();
    if (!key) return res.status(503).json({ error: 'TwelveLabs is not configured', configured: false });
    const now = Date.now();
    if (now >= until) {
      clients.clear();
      users.clear();
      providerRequests = 0;
      until = now + 60000;
    }
    const ip = req.ip || 'unknown';
    if ((!clients.has(ip) && clients.size >= 2048) || (clients.get(ip) || 0) >= clientLimit) {
      return res.set('Retry-After', String(Math.max(1, Math.ceil((until - now) / 1000))))
        .status(429).json({ error: 'Video analysis rate limit exceeded' });
    }
    clients.set(ip, (clients.get(ip) || 0) + 1);
    res.locals.apiKey = key;
    next();
  });
  router.get('/status', (_req, res) => res.json({ configured: true }));
  router.use(requireUser, (req, res, next) => {
    const count = users.get(req.authUser.id) || 0;
    if (count >= 60 || providerRequests >= providerLimit) {
      return res.set('Retry-After', String(Math.max(1, Math.ceil((until - Date.now()) / 1000))))
        .status(429).json({ error: 'Video analysis rate limit exceeded' });
    }
    users.set(req.authUser.id, count + 1);
    providerRequests++;
    next();
  });
  router.use(express.json({ limit: '64kb' }));

  async function upstream(res, path, options, project) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { ...options.headers, 'x-api-key': res.locals.apiKey },
      });
      if (!response.ok) {
        await response.body?.cancel();
        return res.status(response.status === 429 ? 429 : response.status >= 500 || [401, 403].includes(response.status) ? 502 : 400)
          .json({ error: 'TwelveLabs request failed' });
      }
      if (!response.body || Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
        await response.body?.cancel();
        throw new Error('Invalid upstream response');
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error('Upstream response too large');
        }
        chunks.push(Buffer.from(value));
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const json = JSON.stringify(project(data), (_key, value) => typeof value === 'string'
        ? value.replaceAll(res.locals.apiKey, '[redacted]') : value);
      return res.type('json').send(json);
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      return res.status(timeout ? 504 : 502).json({ error: timeout ? 'TwelveLabs request timed out' : 'TwelveLabs request failed' });
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
      body: JSON.stringify({ index_name: req.body.index_name.trim(), models: [{ model_name: 'marengo2.7', model_options: ['visual', 'audio'] }] }),
    }, (data) => {
      const { _id } = identifier(data);
      return { _id: `${_id}.${indexSignature(_id, req.authUser.id, res.locals.apiKey)}` };
    });
  });
  router.post('/uploads', express.raw({ type: ['video/*', 'application/octet-stream'], limit: '4mb' }), (req, res) => {
    const indexId = ownedIndex(req, res, req.query.index_id);
    if (!indexId) return;
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'A valid index_id and non-empty video body are required (maximum 4 MiB)' });
    }
    const form = new FormData();
    form.append('index_id', indexId);
    form.append('video_file', new Blob([req.body], { type: req.get('Content-Type') || 'application/octet-stream' }), 'footage.mp4');
    return upstream(res, '/uploads', { method: 'POST', body: form }, identifier);
  });
  router.get('/indexes/:indexId/videos/:videoId', (req, res) => {
    const indexId = ownedIndex(req, res, req.params.indexId);
    if (!indexId) return;
    const { videoId } = req.params;
    if (!validId(videoId)) return res.status(400).json({ error: 'Invalid video identifier' });
    return upstream(res, `/indexes/${indexId}/videos/${videoId}`, { method: 'GET' }, (data) => ({
      system_metadata: { status: data?.system_metadata?.status === 'ready' ? 'ready' : 'pending', ready: data?.system_metadata?.ready === true },
    }));
  });
  router.post('/search', (req, res) => {
    if (!validText(req.body?.query, 2000)) return res.status(400).json({ error: 'A valid query is required' });
    const indexId = ownedIndex(req, res, req.body?.index_id);
    if (!indexId) return;
    return upstream(res, '/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index_id: indexId, query: req.body.query.trim(), search_options: ['visual', 'audio'] }),
    }, (data) => {
      const clips = data?.clips ?? data?.data;
      if (!Array.isArray(clips)) throw new Error('Invalid upstream search result');
      return { clips: clips.slice(0, 1000).map((clip) => {
        const rawStart = Number(clip.start ?? clip.start_sec ?? 0);
        const start = Number.isFinite(rawStart) ? Math.max(0, rawStart) : 0;
        const rawEnd = clip.end ?? clip.end_sec;
        const end = rawEnd == null ? undefined : Number(rawEnd);
        const text = clip.text ?? clip.description;
        return {
          start, end: Number.isFinite(end) && end > start ? end : undefined,
          text: typeof text === 'string' && text.trim() ? text.slice(0, 2000) : undefined,
          confidence: Number(clip.confidence ?? clip.score ?? 0.5),
        };
      }) };
    });
  });
  return router;
}
