import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { MobileContainer } from '@/src/components/MobileContainer';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';

function LifeRegenChecker() {
  const checkLifeRegen = useGameStore((s) => s.checkLifeRegen);
  useEffect(() => { checkLifeRegen(); const id = setInterval(checkLifeRegen, 60000); return () => clearInterval(id); }, [checkLifeRegen]);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MobileContainer>
        <LifeRegenChecker />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="game/[levelId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="game/daily" options={{ gestureEnabled: false }} />
          <Stack.Screen name="game/speed" options={{ gestureEnabled: false }} />
          <Stack.Screen name="game/spot" options={{ gestureEnabled: false }} />
          <Stack.Screen name="game/result" />
          <Stack.Screen name="settings" />
        </Stack>
      </MobileContainer>
    </AuthProvider>
  );
}
