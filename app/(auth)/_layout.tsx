import { Stack } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';

function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    />
  );
}

export default AuthLayout;
