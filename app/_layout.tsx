import { useEffect, useRef, useCallback, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { Stack, useRouter, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { parseInviteUrl, storePendingInvite, processPendingInvite } from '@/src/utils/deepLinks';
import {
  registerPushToken,
  cancelLivesFullNotification,
  scheduleStreakReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  loadDailyReminderTime,
  loadNotificationPreferences,
  scheduleWinBackReminders,
  cancelWinBackReminders,
  scheduleWeeklyChallengeReminder,
  scheduleOnboardingPushes,
  syncTimezoneToProfile,
} from '@/src/utils/notifications';
import { shouldShowComebackReward } from '@/src/lib/comebackReward';
import { ComebackRewardModal } from '@/src/components/ComebackRewardModal';
import { ThemeProvider, useTheme } from '@/src/providers/ThemeProvider';
import { MobileContainer } from '@/src/components/MobileContainer';
import { useGameStore } from '@/src/store';
import { updateOnlineStatus } from '@/src/utils/friends';
import { expireOldChallenges } from '@/src/utils/challengeFlow';
import { sounds } from '@/src/lib/sounds';
import { seedStreakMilestonesIfMissing } from '@/src/utils/streakRewards';
import { StreakRewardToast } from '@/src/components/StreakRewardToast';
import { IncomingInviteListener } from '@/src/components/IncomingInviteListener';
import { ReviewPrompt } from '@/src/components/ReviewPrompt';
import { initAdsAndTracking } from '@/src/utils/adService';
import { initMetaSdk } from '@/src/lib/metaSdk';
import { initAnalytics, identify as analyticsIdentify, resetAnalytics } from '@/src/lib/analytics';
import { RootErrorBoundary } from '@/src/components/RootErrorBoundary';
import { OfflineScreen } from '@/src/components/OfflineScreen';
import { applyLanguage, t } from '@/src/i18n';

SplashScreen.preventAutoHideAsync();

function StoreHydrator() {
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return null;
}

/** Keep the i18n layer's active locale in lockstep with the user's
 *  preference. `applyLanguage` is also called synchronously from
 *  `setPreferredLanguage` for instant tap-to-re-render, but this
 *  effect handles cold-start + the loadFromCloud case where the
 *  cloud value rides into local state via the hydrate merge. */
function LocaleApplier() {
  const preferred = useGameStore((s) => s.preferredLanguage);
  useEffect(() => {
    applyLanguage(preferred);
  }, [preferred]);
  return null;
}

function SoundLoader() {
  useEffect(() => { sounds.init(); }, []);
  return null;
}

/** Fire the iOS App Tracking Transparency prompt and bring up the
 *  AdMob SDK. App Store guideline 5.1.2 requires this BEFORE any
 *  ad request, otherwise reviewers reject for "tracking without
 *  consent". Idempotent — only runs once per app session. */
function AdsInitialiser() {
  useEffect(() => {
    // Order matters: AdMob's init runs the ATT prompt. Once that
    // resolves we kick off the Meta SDK so it picks up the resolved
    // tracking status (granted / denied) on its very first event.
    // Both are individually idempotent — safe to chain.
    (async () => {
      await initAdsAndTracking();
      await initMetaSdk();
    })();
  }, []);
  return null;
}

/** Fire-and-forget PostHog init. Called once on first mount. Safe
 *  even when the API key is missing — the SDK wrapper no-ops and
 *  the app still builds and runs. */
function AnalyticsInitialiser() {
  useEffect(() => { initAnalytics(); }, []);
  return null;
}

function LevelCacheLoader() {
  useEffect(() => {
    // Cache all level definitions from Supabase on startup (if online)
    require('@/src/utils/levelCache').LevelCache.syncLevelCache();
  }, []);
  return null;
}

function DeepLinkHandler() {
  const { user, markPasswordRecovery } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle incoming deep links. Two flows live here:
    //  1. Friend invites (blanked://invite/<id>)
    //  2. Password recovery — Supabase emails contain a link that
    //     resolves to blanked://reset-password?code=<pkce_code> on
    //     native. Because supabase-js is configured with
    //     detectSessionInUrl=false on native (true would only work
    //     if the URL hit a webview), we have to manually extract
    //     the PKCE code and exchange it for a session. That call
    //     then triggers the PASSWORD_RECOVERY auth event which the
    //     other effect below routes on.
    const handleUrl = async ({ url }: { url: string }) => {
      // Friend invite path — unchanged.
      const inviterId = parseInviteUrl(url);
      if (inviterId) storePendingInvite(inviterId);

      // Password reset path. Supabase PKCE puts the code in either
      // the query string OR the URL fragment depending on flow.
      // Parse both. We also accept the legacy magic-link format
      // that uses access_token + refresh_token in the fragment.
      //
      // On any failure we surface a user-facing alert so they're
      // not silently dumped on the login screen wondering what
      // happened. The most common cause is an expired link (>1 hr).
      try {
        const isReset = url.includes('reset-password');
        if (!isReset) return;

        // CRITICAL: set the recovery flag BEFORE we exchange the code.
        // Supabase's exchange will fire both `SIGNED_IN` and
        // `PASSWORD_RECOVERY` events, and `app/index.tsx` reacts to
        // the session appearing by redirecting to `(tabs)`. If we
        // only set the flag AFTER exchange (via the PASSWORD_RECOVERY
        // event listener in AuthProvider), we lose the race and the
        // user ends up on the home tab, auto-logged-in — which is
        // exactly the bug we're fixing. Setting it here guarantees
        // index.tsx's first re-render already sees `passwordRecovery
        // === true` and routes to the reset screen.
        markPasswordRecovery();

        const fail = async (msg: string) => {
          // Sign out so the user doesn't end up with a half-finished
          // recovery session that would bypass the login screen on
          // next launch. Safe even if no session exists.
          try { await supabase.auth.signOut(); } catch {}
          Alert.alert(
            t('reset_link.invalid_title'),
            t('reset_link.invalid_body', { msg }),
          );
        };
        const codeMatch = url.match(/[?&#]code=([^&]+)/);
        if (codeMatch?.[1]) {
          const { error } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
          if (error) {
            console.warn('exchangeCodeForSession failed:', error.message);
            await fail(t('reset_link.expired'));
          }
          return;
        }
        // Fallback: legacy hash-fragment tokens
        const hashIdx = url.indexOf('#');
        if (hashIdx > -1) {
          const params = new URLSearchParams(url.slice(hashIdx + 1));
          const access = params.get('access_token');
          const refresh = params.get('refresh_token');
          if (access && refresh) {
            const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
            if (error) {
              console.warn('setSession from hash failed:', error.message);
              await fail(t('reset_link.expired'));
            }
          } else {
            await fail(t('reset_link.missing_token'));
          }
        }
      } catch (e) {
        console.warn('password reset deep link handler threw:', e);
        try { await supabase.auth.signOut(); } catch {}
        Alert.alert(t('reset_link.invalid_title'), t('reset_link.invalid_body', { msg: t('auth.generic_error') }));
      }
    };

    // Cold-start URL (app opened directly from the email link)
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); }).catch(() => {});

    // Foreground URL (app was already open when the link fired)
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // Process pending invite after auth
  useEffect(() => {
    if (user?.id) processPendingInvite(user.id);
  }, [user?.id]);

  // PASSWORD_RECOVERY auth event fires after exchangeCodeForSession
  // succeeds (or for the legacy hash-fragment flow when setSession
  // succeeds with a recovery token). Either way: route to the
  // reset screen. Keeping the router.push here rather than in
  // AuthProvider keeps routing concerns out of the provider.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/(auth)/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

function LifeRegenChecker() {
  const checkLifeRegen = useGameStore((s) => s.checkLifeRegen);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Check immediately + on interval
    checkLifeRegen();
    const id = setInterval(checkLifeRegen, 60000);

    // Also check when app returns from background (iOS suspends intervals)
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        checkLifeRegen();
      }
      appState.current = next;
    });

    return () => { clearInterval(id); sub.remove(); };
  }, [checkLifeRegen]);

  return null;
}

function CloudSyncLoader() {
  const loadFromCloud = useGameStore((s) => s.loadFromCloud);
  const syncToCloud = useGameStore((s) => s.syncToCloud);
  const saveState = useGameStore((s) => s.saveState);
  const setAuthUserId = useGameStore((s) => s.setAuthUserId);
  const resetForNewUser = useGameStore((s) => s.resetForNewUser);
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);
  // Track the last user ID we synced for so we can detect account
  // switches on the same device. Without this, logging in as a new
  // user on a device where another user already played inherits their
  // gems / streak / world / stars via the max-merge in loadFromCloud.
  const lastUserIdRef = useRef<string | null>(null);

  // Load from cloud on login + update online status + expire old challenges
  useEffect(() => {
    if (!user?.id) {
      // Sign-out path: user cleared. If we had a previous user, wipe
      // local state so the next sign-in doesn't leak the old account.
      if (lastUserIdRef.current) {
        resetForNewUser();
        // Clear PostHog's identified user so the next anonymous
        // session doesn't show up under the previous user's
        // timeline.
        resetAnalytics();
        lastUserIdRef.current = null;
      }
      return;
    }

    // Account switch on the same device (e.g. signed out of account A
    // and into account B) — reset first so the loadFromCloud that
    // follows doesn't max-merge A's higher values into B's fresh row.
    //
    // Two paths:
    //   1. Same-session switch: lastUserIdRef is the previous user.id
    //   2. Cold start on a device where the previous user's progress
    //      is still in localStorage — we stamp _authUserId inside the
    //      blob, so we can compare here and reset before we even
    //      kick off loadFromCloud.
    const prevUserId = lastUserIdRef.current;
    let storedUserId: string | null = null;
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('blanked-progress');
        if (raw) {
          const parsed = JSON.parse(raw) as { _authUserId?: string | null };
          storedUserId = parsed._authUserId ?? null;
        }
      }
    } catch {}

    const switchedInSession = prevUserId && prevUserId !== user.id;
    const coldStartMismatch = !prevUserId && storedUserId && storedUserId !== user.id;
    if (switchedInSession || coldStartMismatch) {
      resetForNewUser();
    }
    lastUserIdRef.current = user.id;

    setAuthUserId(user.id); // Store real auth ID for cloud sync
    // Tie all subsequent PostHog events to this user row. Deliberately
    // passes NO PII — just the Supabase UUID (which is already how the
    // app references the user internally). App Privacy nutrition label:
    // User ID, linked to user, not used for tracking.
    analyticsIdentify(user.id);
    loadFromCloud(user.id).then(() => {
      // Cold-start check: if the user is an active Blanked+
      // subscriber and their last monthly gem grant is >30 days
      // ago (or they've never been granted), credit the 300 gems.
      // The cooldown check inside the action makes this a no-op
      // most of the time — safe to call on every launch.
      useGameStore.getState().maybeGrantMonthlyPlusGems();
    }).catch(() => {});
    updateOnlineStatus(user.id);
    expireOldChallenges();
    registerPushToken(user.id);
    // Mirror the device's IANA timezone to the profile so the
    // server-side push scheduler (push-dispatch edge fn) can fire the
    // morning 9am hype push at the user's local 9am, not UTC 9am.
    // Idempotent — writes only when the stored tz differs from what
    // Intl resolves on-device right now (handles travel).
    syncTimezoneToProfile(user.id);
    // Idempotent: insert any missing streak_rewards rows for this player
    seedStreakMilestonesIfMissing(user.id);

    // Notification scheduling. Each of these is idempotent — it
    // cancels any prior pending version of the same identifier before
    // scheduling, so calling on every app open is safe.
    //  - Daily reminder: fires at user-configured time each day
    //  - Weekly challenge: fires Sunday 7pm local (resets every week)
    //  - Win-back: 3/7/14 days of absence — cancelled on next foreground
    Promise.all([
      loadNotificationPreferences(user.id),
      loadDailyReminderTime(user.id),
    ]).then(([prefs, time]) => {
      if (prefs.daily_reminder !== false && time) {
        scheduleDailyReminder(time);
      } else {
        cancelDailyReminder();
      }
      if (prefs.weekly_challenge !== false) {
        scheduleWeeklyChallengeReminder();
      }
    }).catch(() => {});
    // Cancel any pending win-back since the user just opened the app.
    cancelWinBackReminders();
    // First-week onboarding pushes — denser cadence over days 1-7
    // when habit formation is most fragile. Anchored to the user's
    // first-app-open timestamp (persisted to AsyncStorage on first
    // launch) so the schedule survives app restarts. Already-passed
    // days are skipped inside the scheduler.
    (async () => {
      try {
        const FIRST_OPEN_KEY = 'blanked_first_open_at';
        let firstOpenedRaw = await AsyncStorage.getItem(FIRST_OPEN_KEY);
        if (!firstOpenedRaw) {
          firstOpenedRaw = new Date().toISOString();
          await AsyncStorage.setItem(FIRST_OPEN_KEY, firstOpenedRaw);
        }
        scheduleOnboardingPushes(new Date(firstOpenedRaw));
      } catch {}
    })();
    // Update online status every 60 seconds (for 3-tier: online/recent/offline)
    const interval = setInterval(() => updateOnlineStatus(user.id), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, loadFromCloud, resetForNewUser, setAuthUserId]);

  // Sync on foreground (pull latest from other devices) + save on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        // Returning to foreground — pull latest cloud data + update online status
        if (user?.id) {
          loadFromCloud(user.id).then(() => {
            // After cloud sync settles, check if an active Blanked+
            // subscriber is due their monthly 300-gem drop. This
            // is the primary path for yearly subscribers: they pay
            // once for the year, but open the app across 12 months
            // and accrue the monthly gem drop on each 30-day
            // anniversary. Safe to call unconditionally — the
            // 30-day cooldown check lives inside the action.
            useGameStore.getState().maybeGrantMonthlyPlusGems();
          }).catch(() => {});
          updateOnlineStatus(user.id);
        }
        // Cancel any pending win-back notifications — the player came
        // back, so we don't want to nag them tomorrow.
        cancelWinBackReminders();
      }
      if (next === 'background' || next === 'inactive') {
        // Going to background — push local state to cloud + localStorage
        saveState();
        syncToCloud();
        // Arm the 3/7/14-day win-back series. If the player returns
        // before each trigger, the foreground handler above cancels
        // them. If they don't return, the 3-day hits first, then 7,
        // then 14 — gentle escalating nudges.
        if (user?.id) {
          // Respect the user's win_back preference (synchronous
          // load via the already-fetched profile would be ideal,
          // but the cached value in localStorage is fine here too).
          loadNotificationPreferences(user.id).then((prefs) => {
            if (prefs.win_back !== false) scheduleWinBackReminders();
          }).catch(() => {});
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user?.id, loadFromCloud, saveState, syncToCloud]);

  return null;
}

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let responseSubscription: any;
    try {
      const Notifications = require('expo-notifications');

      // Handle notification taps — navigate to appropriate screen
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data;
        if (!data?.type) return;

        switch (data.type) {
          case 'streak_reminder':
          case 'lives_full':
          case 'win_back':
            router.push('/(tabs)');
            break;
          case 'friend_challenge':
            if (data.challengeId) {
              const cMode = data.mode ?? 'classic';
              if (cMode === 'classic') {
                router.push({ pathname: '/game/challenge', params: { challengeId: data.challengeId, mode: 'play' } });
              } else {
                router.push({ pathname: '/game/challenge-mode', params: { challengeId: data.challengeId, mode: cMode, action: 'play' } });
              }
            }
            break;
          case 'challenge_result':
            if (data.challengeId) router.push({ pathname: '/game/challenge-result', params: { challengeId: data.challengeId } });
            break;
          case 'friend_request':
            router.push('/(tabs)/friends');
            break;
          case 'friend_online':
            router.push('/(tabs)/friends');
            break;
        }
      });
    } catch {}

    return () => { if (responseSubscription) responseSubscription.remove(); };
  }, [router]);

  // Cancel lives-full notification when app comes to foreground (they're already in the app)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    cancelLivesFullNotification();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') cancelLivesFullNotification();
    });
    return () => sub.remove();
  }, []);

  return null;
}

/** Renders the streak reward toast slide-down whenever the queue has
 *  items. Lives here so any milestone claim — from any screen — surfaces
 *  consistently on top of the navigation stack. */
function StreakRewardToastMounter() {
  const queue = useGameStore((s) => s.streakRewardQueue);
  const clear = useGameStore((s) => s.clearStreakRewardQueue);
  if (!queue || queue.length === 0) return null;
  return <StreakRewardToast queue={queue} onDone={clear} />;
}

/** Mounts the comeback-reward modal on app launch when the player
 *  qualifies (away 7+ days, last claim 14+ days ago, has at least one
 *  prior play session).
 *
 *  Runs the eligibility check:
 *  1. Once when cloud hydration completes (so we read the LATEST
 *     lastPlayDate from the cloud, not a stale local copy)
 *  2. Again whenever the app returns to foreground (so a player who
 *     leaves the tab open for 8 days then opens the app sees the
 *     modal — without this, `checked.current` would block forever).
 *
 *  Guarded so we never schedule a second check while the first is
 *  still in flight. */
function ComebackRewardMounter() {
  const [visible, setVisible] = useState<boolean>(false);
  const cloudHydrated = useGameStore((s) => s._cloudHydrated);
  const authUserId = useGameStore((s) => s._authUserId);
  const checking = useRef(false);

  // Treat guests as 'hydrated' since they have no cloud state to wait for.
  const ready = cloudHydrated || !authUserId;

  const runCheck = useCallback(() => {
    if (checking.current || visible) return;
    checking.current = true;
    shouldShowComebackReward()
      .then((eligible) => {
        if (eligible) setVisible(true);
      })
      .catch(() => {})
      .finally(() => {
        checking.current = false;
      });
  }, [visible]);

  // Initial check after cloud hydration settles.
  useEffect(() => {
    if (!ready) return;
    runCheck();
  }, [ready, runCheck]);

  // Re-check every time the app foregrounds, in case the user left
  // the app open across a churn boundary.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && ready) runCheck();
    });
    return () => sub.remove();
  }, [ready, runCheck]);

  return <ComebackRewardModal visible={visible} onClose={() => setVisible(false)} />;
}

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="username" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game/[levelId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/speed" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/spot" options={{ gestureEnabled: false }} />
        <Stack.Screen name="world/[worldId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="world/side-world" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="game/result" />
        <Stack.Screen name="game/challenge" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/challenge-result" />
        <Stack.Screen name="game/challenge-select" />
        <Stack.Screen name="game/challenge-mode" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/challenge-waiting" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/side-campaign" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="streak-rewards" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="stats-space" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/sounds" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const onLayoutReady = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    // RootErrorBoundary wraps the WHOLE tree so a thrown render
    // anywhere — provider, layout, screen — surfaces a recovery
    // screen instead of a white crash. Critical for App Store
    // review on devices with corrupted caches / bad network.
    <RootErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <MobileContainer onLayout={onLayoutReady}>
          <StoreHydrator />
          <LocaleApplier />
          <SoundLoader />
          <AdsInitialiser />
          <AnalyticsInitialiser />
          <LevelCacheLoader />
          <DeepLinkHandler />
          <LifeRegenChecker />
          <CloudSyncLoader />
          <NotificationHandler />
          <ThemedStack />
          <StreakRewardToastMounter />
          <IncomingInviteListener />
          {/* Stage A "Rate BLANKED" modal — driven by reviewPromptVisible
              in gameStore. Mounted once at root so it overlays any
              screen (level result, streak celebration, challenge result,
              etc.) without needing to be imported per-trigger. */}
          <ReviewPrompt />
          {/* Comeback gem reward modal — fires on app open if the
              user has been away 7+ days AND it's been 14+ days since
              their last claim. Decision happens in
              ComebackRewardMounter so this overlay file stays clean. */}
          <ComebackRewardMounter />
          {/* Global offline takeover — renders null while online,
              full-screen Blink + CTA when NetInfo reports no
              connection. Mounted last so it overlays every screen. */}
          <OfflineScreen />
        </MobileContainer>
      </AuthProvider>
    </ThemeProvider>
    </RootErrorBoundary>
  );
}

export default RootLayout;
