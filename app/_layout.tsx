import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { ThemeProvider, useTheme } from '@/src/providers/ThemeProvider';
import { MobileContainer } from '@/src/components/MobileContainer';
import { useGameStore } from '@/src/store';

function StoreHydrator() {
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
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
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // Load from cloud on login
  useEffect(() => {
    if (user?.id) { loadFromCloud(user.id); }
  }, [user?.id, loadFromCloud]);

  // Sync on foreground (pull latest from other devices) + save on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        // Returning to foreground — pull latest cloud data
        if (user?.id) { loadFromCloud(user.id); }
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
          <LifeRegenChecker />
          <CloudSyncLoader />
          <ThemedStack />
        </MobileContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
