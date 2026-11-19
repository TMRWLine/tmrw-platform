import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { supabasePublicKey, supabaseSecretKey } from '../../supabase-keys.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = supabaseSecretKey() || supabasePublicKey();

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
