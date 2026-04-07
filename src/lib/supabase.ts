import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let storage: Record<string, unknown> | undefined = undefined; // Use Supabase default (localStorage) on web

if (Platform.OS !== 'web') {
  // Only import AsyncStorage on native platforms
  try {
    storage = require('@react-native-async-storage/async-storage').default;
  } catch {
    // AsyncStorage not available, fall back to default
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
