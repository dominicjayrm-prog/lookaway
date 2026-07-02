import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { initPurchases, identifyUser, logOutPurchases } from '@/src/lib/purchases';

/** Username prefix for guest accounts. The home redirect uses this
 *  prefix to recognise auto-generated names so anonymous users
 *  aren't bounced into the /username picker. Kept exported so the
 *  upgrade screen can detect "this user still has the auto-generated
 *  name" and pre-fill the username field with an empty input. */
export const GUEST_USERNAME_PREFIX = 'player_';

/** Build a deterministic auto-generated username for a fresh anon
 *  session. Length stays under the 16-char `username` ceiling so the
 *  same profanity / shape constraints applied to picked names also
 *  pass for guests without special-casing the trigger. */
function guestUsernameForId(userId: string): string {
  // First 6 hex chars of the UUID — collision-resistant enough at this
  // app's scale, predictable enough for the upgrade screen to detect.
  const suffix = userId.replace(/[^a-f0-9]/gi, '').slice(0, 6).toLowerCase();
  return `${GUEST_USERNAME_PREFIX}${suffix || '000000'}`;
}

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
  /** Returns `userId` alongside the standard `error`. Email signup
   *  needs the new user's id IMMEDIATELY after the auth call to write
   *  the chosen username into `profiles` — relying on
   *  `supabase.auth.getSession()` was unreliable on web because the
   *  auth-state listener that populates the local session storage
   *  fires asynchronously, so a fast follow-up `getSession()` can
   *  return null even after `signUp` resolved. The signup form upserts
   *  using `userId` directly, dodging that race. */
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null; userId: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<SocialSignInResult>;
  signOut: () => Promise<void>;
  /** True when the current session was created via signInAnonymously().
   *  Read from auth.users.is_anonymous which Supabase populates and
   *  ships in the session payload. Used to:
   *    - gate social participation (friend requests, leaderboard posts)
   *    - keep guests off the global board / friend search
   *    - show the contextual "Save your account" sheet on social taps
   *    - drive the Settings "Save your account" entry visibility
   *  Pure boolean derived from `session`, so it flips reactively
   *  the moment a guest upgrades. */
  isGuest: boolean;
  /** Create a fresh anonymous session and seed `profiles` with an
   *  auto-generated `player_xxxx` username. Used by the post-onboarding
   *  "Maybe later" link so new users from Meta ads can play
   *  immediately without typing email / password / username. */
  signInAsGuest: () => Promise<{ error: string | null }>;
  /** Convert the current anonymous session into a real email account.
   *  Same UUID stays — `updateUser({ email, password })` attaches
   *  credentials to the existing auth.users row; every FK pointing
   *  at this user (progress, purchases, friendships) is preserved.
   *  The `username` argument lets the upgrade screen replace the
   *  `player_xxxx` placeholder with the player's chosen handle. */
  upgradeFromGuest: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  /** Same as upgradeFromGuest but attaches an Apple identity via
   *  `linkIdentity({ provider: 'apple' })`. UUID unchanged. The
   *  username arg is optional — if omitted the placeholder stays and
   *  the user can rename later. */
  upgradeFromGuestWithApple: (username?: string) => Promise<SocialSignInResult>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  passwordRecovery: false,
  markPasswordRecovery: () => {},
  clearPasswordRecovery: () => {},
  signUp: async () => ({ error: null, userId: null }),
  signIn: async () => ({ error: null }),
  signInWithApple: async () => ({ ok: false, reason: 'unsupported', message: 'not initialised' }),
  signOut: async () => {},
  isGuest: false,
  signInAsGuest: async () => ({ error: 'not initialised' }),
  upgradeFromGuest: async () => ({ error: 'not initialised' }),
  upgradeFromGuestWithApple: async () => ({ ok: false, reason: 'unsupported', message: 'not initialised' }),
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `display_name` is consumed by the `handle_new_user` trigger
        // to prefill `profiles.display_name`. Username is written
        // separately by the signup form right after this resolves.
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    // `data.user` is populated by Supabase synchronously when
    // signup succeeds (email confirmation off in this app), even
    // before the auth-state listener fires its SIGNED_IN event.
    // Returning the id here lets the caller upsert `profiles.username`
    // without relying on the session being available via getSession.
    return { error: error?.message ?? null, userId: data?.user?.id ?? null };
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
        // NOTE: Meta CompletedRegistration intentionally NOT fired
        // here anymore. The event now means "activated" and fires
        // exactly once on the player's first level completion (see
        // gameStore.completeLevel), regardless of auth path — one
        // consistent conversion definition for the ad algorithm.
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

  /** Create an anonymous Supabase session and seed `profiles` with a
   *  generated `player_xxxx` username. Two reasons we write the
   *  username here client-side rather than relying on the trigger:
   *
   *    1. The trigger has no idea what UUID it's generating until
   *       AFTER the row is created, so it can't deterministically
   *       slice the id into a username.
   *    2. The home redirect in app/index.tsx bounces any user with a
   *       null username to /username — for guests that picker would
   *       block the very flow we're trying to unblock. Setting the
   *       username inline means the next render lands directly in
   *       /(tabs) with no detour. */
  const signInAsGuest = async (): Promise<{ error: string | null }> => {
    log.breadcrumb('auth', 'guest sign-in started');
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      log.error('auth', 'guest sign-in failed', error ?? new Error('no user'));
      return { error: error?.message ?? 'Could not start guest session.' };
    }
    const userId = data.user.id;
    const username = guestUsernameForId(userId);
    // Upsert (not insert) so a re-run on the same anonymous session
    // — rare, but possible if the user backgrounds the app between
    // anonymous-signin and the upsert — doesn't 23505 the trigger
    // row that handle_new_user already created.
    const { error: upsertErr } = await supabase.from('profiles').upsert({
      id: userId,
      username,
      display_name: username,
      is_anonymous: true,
    }, { onConflict: 'id' });
    if (upsertErr) {
      log.error('auth', 'guest profile upsert failed', upsertErr);
      // Don't fail the whole flow — the trigger already created a
      // profile row, the home redirect will bounce to /username, and
      // the user can still progress (just less smoothly). Return ok
      // so the UI doesn't surface an error toast on a recoverable race.
    }
    // NOTE: no Meta CompletedRegistration here. Firing it on guest
    // creation taught the ad algorithm to find people who tap
    // "continue as guest" and bounce. The event now fires on the
    // player's FIRST LEVEL COMPLETION (see gameStore.completeLevel) —
    // activation, not registration — so Meta optimises toward people
    // who actually play.
    log.breadcrumb('auth', 'guest sign-in complete', { userId });
    return { error: null };
  };

  /** Convert a guest session to a real email account. Calls
   *  `updateUser({ email, password })` which:
   *    - keeps the existing auth.users.id (so every FK to user_id
   *      stays valid — progress, purchases, friendships all preserved)
   *    - flips auth.users.is_anonymous from true to false
   *    - sends a confirmation email if email-confirm is enabled on
   *      the Supabase project (we leave that off in this app, so the
   *      account is immediately usable on next session)
   *
   *  Then updates the profile row to flip the mirrored is_anonymous
   *  flag and set the player's chosen username (replacing the
   *  `player_xxxx` placeholder).
   *
   *  Handles the "email already registered" error explicitly with a
   *  surfacable message — the calling screen shows a sheet warning
   *  the user that signing into the existing account would lose
   *  their guest progress. */
  const upgradeFromGuest = async (
    email: string,
    password: string,
    username: string,
  ): Promise<{ error: string | null }> => {
    if (!session?.user) return { error: 'no_session' };
    if (!session.user.is_anonymous) return { error: 'not_a_guest' };

    log.breadcrumb('auth', 'guest upgrade started (email)');
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) {
      // Supabase returns "User already registered" / "email already
      // in use" depending on SDK version. Normalise into a stable
      // code the UI can switch on for the "lose your progress?" sheet.
      const msg = error.message ?? '';
      if (/already.*(registered|exist|use)/i.test(msg)) {
        log.warn('auth', 'guest upgrade collided with existing email');
        return { error: 'email_taken' };
      }
      log.error('auth', 'guest upgrade failed', error);
      return { error: error.message };
    }

    // Flip the mirrored flag + write the chosen username. We do this
    // even if the trigger or auth state listener also touches the
    // row later — the explicit upsert here makes the success path
    // synchronous so the UI can navigate immediately and trust the
    // profile reads that follow.
    const userId = session.user.id;
    const { error: upsertErr } = await supabase.from('profiles').update({
      username,
      display_name: username,
      is_anonymous: false,
    }).eq('id', userId);
    if (upsertErr) {
      log.error('auth', 'profile upgrade write failed', upsertErr);
      // Auth account is upgraded, profile row update failed — surface
      // the error so the screen can retry or show support copy.
      return { error: 'profile_update_failed' };
    }
    log.breadcrumb('auth', 'guest upgrade complete (email)', { userId });
    return { error: null };
  };

  /** Convert a guest session to a real Apple account. Two paths:
   *
   *    - linkIdentity({ provider: 'apple' }) on supabase v2 — opens
   *      the system Apple sheet via Supabase's own flow and attaches
   *      the Apple identity to the current user
   *    - if linkIdentity isn't available (older runtime), fall back
   *      to running the same native AppleAuthentication.signInAsync
   *      flow used by `signInWithApple` then calling
   *      `signInWithIdToken({ provider: 'apple', token })` — Supabase
   *      treats this as "associate Apple identity with currently
   *      signed-in user" when the existing session is anonymous
   *
   *  We prefer the native flow because it gives us first-time
   *  fullName claims so we can stash a username suggestion.
   *  Returns a SocialSignInResult so the calling screen can branch
   *  on cancellation vs error the same way the login screen does. */
  const upgradeFromGuestWithApple = async (username?: string): Promise<SocialSignInResult> => {
    if (Platform.OS !== 'ios') {
      return { ok: false, reason: 'unsupported', message: 'Sign in with Apple is only available on iOS.' };
    }
    if (!session?.user?.is_anonymous) {
      return { ok: false, reason: 'error', message: 'No guest session to upgrade.' };
    }
    const userId = session.user.id;
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        return { ok: false, reason: 'unsupported', message: 'Sign in with Apple is not available on this device.' };
      }
      const rawNonce = [...Crypto.getRandomBytes(16)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      log.breadcrumb('auth', 'guest upgrade started (apple)');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        return { ok: false, reason: 'error', message: 'Apple did not return a sign-in token. Try again.' };
      }

      // Prefer linkIdentity when the SDK exposes it — keeps the
      // existing anonymous UUID rock-solid. If we fall back to
      // signInWithIdToken with an anon session, Supabase may rotate
      // the user id, which would orphan progress.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authAny = supabase.auth as any;
      let upgradeError: { message?: string } | null = null;
      if (typeof authAny.linkIdentity === 'function') {
        const { error } = await authAny.linkIdentity({
          provider: 'apple',
          options: { idToken: credential.identityToken, nonce: rawNonce },
        });
        upgradeError = error;
      } else {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });
        upgradeError = error;
      }
      if (upgradeError) {
        const msg = upgradeError.message ?? '';
        if (/already.*(linked|registered|exist|use)/i.test(msg)) {
          return { ok: false, reason: 'error', message: 'email_taken' };
        }
        log.error('auth', 'apple upgrade failed', upgradeError);
        return { ok: false, reason: 'error', message: msg || 'Could not link Apple account.' };
      }

      // Build the final username: explicit arg first, then Apple's
      // suggested slug (only sent on first authorisation), then
      // fall back to keeping the existing `player_xxxx` placeholder
      // so the upgrade always succeeds even without a name.
      let finalUsername = username?.trim() ?? '';
      if (!finalUsername) {
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
          if (slug.length >= 3) finalUsername = slug;
        }
      }

      const profileUpdate: Record<string, string | boolean> = { is_anonymous: false };
      if (finalUsername.length >= 3) {
        profileUpdate.username = finalUsername;
        profileUpdate.display_name = finalUsername;
      }
      const { error: upsertErr } = await supabase.from('profiles')
        .update(profileUpdate)
        .eq('id', userId);
      if (upsertErr) {
        log.error('auth', 'profile upgrade write failed (apple)', upsertErr);
        return { ok: false, reason: 'error', message: 'profile_update_failed' };
      }

      log.breadcrumb('auth', 'guest upgrade complete (apple)', { userId });
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        log.breadcrumb('auth', 'apple upgrade cancelled by user');
        return { ok: false, reason: 'cancelled' };
      }
      log.error('auth', 'apple upgrade threw', e);
      return { ok: false, reason: 'error', message: err.message ?? 'Could not link Apple account.' };
    }
  };

  // Derived once per session change. Supabase exposes `is_anonymous`
  // directly on the user object so we don't need a separate fetch.
  const isGuest = useMemo(() => Boolean(session?.user?.is_anonymous), [session]);

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
        isGuest,
        signInAsGuest,
        upgradeFromGuest,
        upgradeFromGuestWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
