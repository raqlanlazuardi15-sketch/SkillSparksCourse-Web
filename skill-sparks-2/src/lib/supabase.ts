import { createClient } from '@supabase/supabase-js';

// Public keys only — safe for the browser. Service-role key NEVER goes here.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);
export const SUPABASE_URL = url;
