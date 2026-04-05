import { Stack } from 'expo-router';
import { colors } from '@/src/theme/colors';

function AuthLayout() {
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
