import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && /^https?:\/\//.test(supabaseUrl) && supabaseAnonKey && supabaseAnonKey.length > 20,
);

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : 'https://offline.invalid',
  isSupabaseConfigured ? supabaseAnonKey! : 'offline-placeholder',
  isSupabaseConfigured ? {} : {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async () => new Response(JSON.stringify({ message: 'Supabase is not configured', code: 'OFFLINE' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  },
);
