import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key') &&
  !supabaseAnonKey.includes('your-supabase-publishable-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    'JalRakshak AI: Supabase URL or Key is missing or using placeholder values. Running with local mock state fallback.'
  );
}

// Fallback URL to prevent crashes during client creation if missing
const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(validUrl, validKey);

export function formatSupabaseError(err: any): string {
  if (!err) return 'An unknown error occurred.';
  const message = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed') ||
    message.includes('TypeError: Failed to fetch')
  ) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  return message;
}

