import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { parseInviteUrl, storePendingInvite, processPendingInvite } from '@/src/utils/deepLinks';
import { registerPushToken, cancelLivesFullNotification, scheduleStreakReminder } from '@/src/utils/notifications';
import { ThemeProvider, useTheme } from '@/src/providers/ThemeProvider';
import { MobileContainer } from '@/src/components/MobileContainer';
import { useGameStore } from '@/src/store';
import { updateOnlineStatus } from '@/src/utils/friends';
import { expireOldChallenges } from '@/src/utils/challengeFlow';

function StoreHydrator() {
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
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
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // Load from cloud on login + update online status + expire old challenges
  useEffect(() => {
    if (!user?.id) return;
    setAuthUserId(user.id); // Store real auth ID for cloud sync
    loadFromCloud(user.id);
    updateOnlineStatus(user.id);
    expireOldChallenges();
    registerPushToken(user.id);
    // Update online status every 60 seconds (for 3-tier: online/recent/offline)
    const interval = setInterval(() => updateOnlineStatus(user.id), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, loadFromCloud]);

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
        <Stack.Screen name="game/daily" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/speed" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/spot" options={{ gestureEnabled: false }} />
        <Stack.Screen name="world/[worldId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="game/result" />
        <Stack.Screen name="game/challenge" options={{ gestureEnabled: false }} />
        <Stack.Screen name="game/challenge-result" />
        <Stack.Screen name="game/challenge-select" />
        <Stack.Screen name="game/challenge-mode" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MobileContainer>
          <StoreHydrator />
          <DeepLinkHandler />
          <LifeRegenChecker />
          <CloudSyncLoader />
          <NotificationHandler />
          <ThemedStack />
        </MobileContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
