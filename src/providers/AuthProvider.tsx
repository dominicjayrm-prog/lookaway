import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { initPurchases, identifyUser, logOutPurchases } from '@/src/lib/purchases';

/** Key we use to hand Apple's suggested display name across the
 *  router boundary between the login screen and the username picker.
 *  Stored on `localStorage` (or the in-memory shim on platforms where
 *  localStorage doesn't exist) and consumed + cleared by username.tsx. */
const USERNAME_SUGGESTION_KEY = 'blanked_username_suggestion';

export function stashUsernameSuggestion(name: string) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(USERNAME_SUGGESTION_KEY, name);
  } catch {
    // Best-effort only — the picker will just start with an empty input.
  }
}

export function consumeUsernameSuggestion(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(USERNAME_SUGGESTION_KEY);
    if (v) localStorage.removeItem(USERNAME_SUGGESTION_KEY);
    return v;
  } catch {
    return null;
  }
}

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
  /**
   * True when the user is in the middle of a password-reset flow.
   *
   * Why this exists: when Supabase exchanges the PKCE code from the
   * reset email it creates a VALID session and fires BOTH
   * `SIGNED_IN` and `PASSWORD_RECOVERY` events. Without this flag,
   * the root redirect in `app/index.tsx` sees `session != null` and
   * drops the user straight into the app — skipping the reset
   * screen entirely. This flag lets index.tsx detour to
   * `/(auth)/reset-password` instead. Cleared on reset success or
   * sign-out.
   */
  passwordRecovery: boolean;
  /** Called by DeepLinkHandler the moment we know the URL is a
   *  reset link — BEFORE the code exchange — so the flag is set by
   *  the time SIGNED_IN fires and the root redirect runs. */
  markPasswordRecovery: () => void;
  /** Called by reset-password.tsx after the password is successfully
   *  updated (before the forced sign-out) so the user can log in
   *  normally on their next attempt. */
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<SocialSignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  passwordRecovery: false,
  markPasswordRecovery: () => {},
  clearPasswordRecovery: () => {},
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithApple: async () => ({ ok: false, reason: 'unsupported', message: 'not initialised' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Configure RevenueCat as early as possible — before we even know
    // who the user is. RevenueCat creates an anonymous user internally
    // until we call identifyUser() on sign-in.
    initPurchases();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      log.setUser(session?.user?.id ?? null);
      // Map the Supabase user to RevenueCat so purchase history
      // follows the account across devices.
      if (session?.user?.id) identifyUser(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        log.setUser(session?.user?.id ?? null);
        log.breadcrumb('auth', `state changed: ${_event}`, { userId: session?.user?.id });
        // Belt-and-braces: if Supabase DOES fire PASSWORD_RECOVERY
        // (it's inconsistent across SDK versions + platforms), latch
        // the flag here too. DeepLinkHandler also sets it before the
        // code exchange so we don't have to rely on this firing.
        if (_event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }
        // Clear the flag on explicit sign-out so the next session
        // (e.g. after the user resets + logs back in) doesn't still
        // think it's in recovery.
        if (_event === 'SIGNED_OUT') {
          setPasswordRecovery(false);
        }
        // Re-identify on sign-in, log out on sign-out so the next
        // session starts anonymous until a new sign-in happens.
        if (session?.user?.id) {
          identifyUser(session.user.id);
        } else if (_event === 'SIGNED_OUT') {
          logOutPurchases();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const markPasswordRecovery = () => setPasswordRecovery(true);
  const clearPasswordRecovery = () => setPasswordRecovery(false);

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
   *   4. On first sign-in, stash Apple's fullName as a *suggestion* for
   *      the username picker screen — NOT an auto-assignment. The
   *      picker (app/username.tsx) prefills the input with it but the
   *      user always gets to see + confirm + override. This is what
   *      makes the "you're in, pick your username" onboarding step feel
   *      intentional instead of silent.
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

      // First-time-only suggestion stash. Apple only returns fullName on
      // the very first authorisation of the app against this Apple ID,
      // so this branch runs exactly once per (user, app) pair. We store
      // the slugified version for the username picker to pre-fill —
      // we do NOT write to profiles.username directly, because the
      // picker is meant to be an intentional choice, not a silent
      // assignment. The user can accept the suggestion or type their own.
      const userId = data.session.user.id;
      const fullName = credential.fullName;
      if (fullName?.givenName || fullName?.familyName) {
        const slug = [fullName.givenName, fullName.familyName]
          .filter(Boolean)
          .join(' ')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 16);
        if (slug.length >= 3) {
          stashUsernameSuggestion(slug);
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
        passwordRecovery,
        markPasswordRecovery,
        clearPasswordRecovery,
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
