import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase auth's storage option expects a SupportedStorage interface,
// but the only meaningful runtime check we can do here is "did
// AsyncStorage load?". Casting to `any` keeps native + web both working
// without dragging in @supabase/auth-js's internal types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any = undefined;

if (Platform.OS !== 'web') {
  // Only import AsyncStorage on native platforms
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// Use a dummy URL when env vars are missing so createClient doesn't throw
// and crash the app at module load time. The client will be non-functional
// but the app will at least start and show the auth screen.
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
