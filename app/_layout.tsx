import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/[levelId]"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="game/result" />
        <Stack.Screen name="settings" />
      </Stack>
    </AuthProvider>
  );
}
