import { createClient } from '@supabase/supabase-js';

export async function authenticatedUser(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 503, error: 'Supabase authentication is not configured' };
  const token = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '')?.[1];
  if (!token) return { status: 401, error: 'A Supabase access token is required' };
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(8000) }) },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.id) return { status: 401, error: 'Invalid Supabase access token' };
    return { user: data.user };
  } catch {
    return { status: 401, error: 'Unable to verify Supabase access token' };
  }
}

export async function requireUser(req, res, next) {
  const result = await authenticatedUser(req);
  if (!result.user) return res.status(result.status).json({ error: result.error });
  req.authUser = result.user;
  next();
}
