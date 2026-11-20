const env = (...names) => names.map((name) => process.env[name]).find(Boolean);

// Publishable/secret keys (sb_...) are preferred over the legacy anon/service_role JWTs.
export const supabasePublicKey = () =>
  env('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

export const supabaseSecretKey = () => env('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');

export const isSupabaseApiKey = (key) => /^sb_(publishable|secret)_/.test(key);

// New-format keys are not JWTs, so they go on `apikey` only; legacy JWT keys keep the Bearer copy.
export const supabaseHeaders = (key) =>
  isSupabaseApiKey(key) ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
