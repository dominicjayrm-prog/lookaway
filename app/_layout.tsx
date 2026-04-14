import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { Stack, useRouter, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { parseInviteUrl, storePendingInvite, processPendingInvite } from '@/src/utils/deepLinks';
import { registerPushToken, cancelLivesFullNotification, scheduleStreakReminder } from '@/src/utils/notifications';
import { ThemeProvider, useTheme } from '@/src/providers/ThemeProvider';
import { MobileContainer } from '@/src/components/MobileContainer';
import { useGameStore } from '@/src/store';
import { updateOnlineStatus } from '@/src/utils/friends';
import { expireOldChallenges } from '@/src/utils/challengeFlow';
import { sounds } from '@/src/lib/sounds';
import { seedStreakMilestonesIfMissing } from '@/src/utils/streakRewards';
import { StreakRewardToast } from '@/src/components/StreakRewardToast';

SplashScreen.preventAutoHideAsync();

function StoreHydrator() {
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return null;
}

function SoundLoader() {
  useEffect(() => { sounds.init(); }, []);
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
  const { user } = useAuth();

  useEffect(() => {
    // Handle incoming deep links
    const handleUrl = ({ url }: { url: string }) => {
      const inviterId = parseInviteUrl(url);
      if (inviterId) storePendingInvite(inviterId);
    };

    // Check initial URL (app opened from link)
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); }).catch(() => {});

    // Listen for future links
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // Process pending invite after auth
  useEffect(() => {
    if (user?.id) processPendingInvite(user.id);
  }, [user?.id]);

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
    loadFromCloud(user.id);
    updateOnlineStatus(user.id);
    expireOldChallenges();
    registerPushToken(user.id);
    // Idempotent: insert any missing streak_rewards rows for this player
    seedStreakMilestonesIfMissing(user.id);
    // Update online status every 60 seconds (for 3-tier: online/recent/offline)
    const interval = setInterval(() => updateOnlineStatus(user.id), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, loadFromCloud, resetForNewUser, setAuthUserId]);

  // Sync on foreground (pull latest from other devices) + save on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        // Returning to foreground — pull latest cloud data + update online status
        if (user?.id) { loadFromCloud(user.id); updateOnlineStatus(user.id); }
      }
      if (next === 'background' || next === 'inactive') {
        // Going to background — push local state to cloud + localStorage
        saveState();
        syncToCloud();
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
    <ThemeProvider>
      <AuthProvider>
        <MobileContainer onLayout={onLayoutReady}>
          <StoreHydrator />
          <SoundLoader />
          <LevelCacheLoader />
          <DeepLinkHandler />
          <LifeRegenChecker />
          <CloudSyncLoader />
          <NotificationHandler />
          <ThemedStack />
          <StreakRewardToastMounter />
        </MobileContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default RootLayout;
