import { createClient } from '@supabase/supabase-js';
import { supabasePublicKey } from './supabase-keys.js';

export async function requireUser(req, res, next) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = supabasePublicKey();
  const token = /^Bearer (\S{1,8192})$/i.exec(req.get('Authorization') || '')?.[1];
  if (!token) return res.status(401).json({ error: 'A Supabase access token is required' });
  if (!url || !key) return res.status(503).json({ error: 'Supabase authentication is not configured' });
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(8000) }) },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.id) return res.status(401).json({ error: 'Invalid Supabase access token' });
    req.authUser = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unable to verify Supabase access token' });
  }
}
