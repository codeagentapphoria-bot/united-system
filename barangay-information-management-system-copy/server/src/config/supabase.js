import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '../utils/envLoader.js';

export const BIMS_BUCKET = 'bims-uploads';

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    loadEnvConfig();
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}
