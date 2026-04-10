import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

/** Possible outcomes of a social sign-in attempt. Distinguishing
 *  `cancelled` from `error` matters because the UI should stay silent
 *  on cancel (user deliberately backed out) but surface a toast on
 *  real failures (network, RLS, Supabase rejection). */
export type SocialSignInResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'unsupported'; message: string }
  | { ok: false; reason: 'error'; message: string };

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<SocialSignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithApple: async () => ({ ok: false, reason: 'unsupported', message: 'not initialised' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // Attach the user id to every subsequent log call so we can
      // correlate breadcrumbs to the specific player who hit the issue.
      log.setUser(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        log.setUser(session?.user?.id ?? null);
        log.breadcrumb('auth', `state changed: ${_event}`, { userId: session?.user?.id });
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  /**
   * Native Sign in with Apple. The flow:
   *
   *   1. Generate a raw nonce + its SHA-256 hash. We pass the HASH to
   *      Apple (so Apple's signed token commits to the hash) and the
   *      RAW nonce to Supabase's signInWithIdToken call. Supabase
   *      hashes the raw nonce internally and compares it to the hash
   *      claim in Apple's token — that's the replay-attack guard.
   *   2. Call AppleAuthentication.signInAsync with the email + fullName
   *      scopes. On first sign-in Apple gives us the name; on every
   *      subsequent sign-in those fields come back null, so we have
   *      exactly one chance to stash them.
   *   3. Hand Apple's identityToken to Supabase via signInWithIdToken.
   *      Supabase validates the JWT's signature, audience, and our
   *      raw nonce, then creates or resumes the user row.
   *   4. If this was a first-time sign-in AND the profile doesn't yet
   *      have a username, seed it from Apple's fullName. Apple's
   *      private-relay emails are useless as display names.
   *
   * Returns a discriminated union so the UI can decide whether to
   * stay silent (cancelled) or surface a toast (error).
   */
  const signInWithApple = async (): Promise<SocialSignInResult> => {
    if (Platform.OS !== 'ios') {
      return {
        ok: false,
        reason: 'unsupported',
        message: 'Sign in with Apple is only available on iOS.',
      };
    }

    try {
      // Apple's own pre-flight check — hardware / software capability.
      // Returns false on simulator accounts without an Apple ID signed in.
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        return {
          ok: false,
          reason: 'unsupported',
          message: 'Sign in with Apple is not available on this device.',
        };
      }

      // Nonce: raw random bytes → hex string → SHA-256 of that string.
      // The raw string goes to Supabase; the hash goes to Apple.
      const rawNonce = [...Crypto.getRandomBytes(16)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      log.breadcrumb('auth', 'apple sign-in started');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        log.warn('auth', 'apple sign-in returned no identity token');
        return {
          ok: false,
          reason: 'error',
          message: 'Apple did not return a sign-in token. Try again.',
        };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error || !data.session) {
        log.error('auth', 'supabase rejected apple token', error ?? new Error('no session'));
        return {
          ok: false,
          reason: 'error',
          message: error?.message ?? 'Could not sign in. Try again.',
        };
      }

      // First-time signup seeding. Apple only returns fullName on the
      // very first authorisation of the app against this Apple ID, so
      // this branch runs exactly once per (user, app) pair.
      const userId = data.session.user.id;
      const fullName = credential.fullName;
      if (fullName?.givenName || fullName?.familyName) {
        try {
          const { data: existing } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
          if (!existing?.username) {
            const suggestedUsername = [fullName.givenName, fullName.familyName]
              .filter(Boolean)
              .join(' ')
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '')
              .slice(0, 20);
            if (suggestedUsername) {
              await supabase
                .from('profiles')
                .update({ username: suggestedUsername })
                .eq('id', userId);
            }
          }
        } catch (e) {
          // Username seeding is best-effort — if it fails the user
          // just ends up on the username-picker screen later.
          log.warn('auth', 'apple username seeding failed', { error: String(e) });
        }
      }

      log.breadcrumb('auth', 'apple sign-in complete', { userId });
      return { ok: true };
    } catch (e: unknown) {
      // Apple sets .code === 'ERR_REQUEST_CANCELED' when the user
      // dismisses the native sheet. That's not an error to show —
      // the UI should just return to its previous state quietly.
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        log.breadcrumb('auth', 'apple sign-in cancelled by user');
        return { ok: false, reason: 'cancelled' };
      }
      log.error('auth', 'apple sign-in threw', e);
      return {
        ok: false,
        reason: 'error',
        message: err.message ?? 'Could not sign in with Apple.',
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUp,
        signIn,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
