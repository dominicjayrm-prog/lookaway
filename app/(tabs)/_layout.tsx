import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import OfflineBanner from '@/src/components/OfflineBanner';
import { useFriendsBadgeCount } from '@/src/hooks/useFriendsBadgeCount';

const isWeb = Platform.OS === 'web';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}[] = [
  { name: 'index', title: 'Play', icon: 'play-circle-outline', iconFocused: 'play-circle' },
  { name: 'journey', title: 'Journey', icon: 'map-outline', iconFocused: 'map' },
  { name: 'friends', title: 'Friends', icon: 'people-outline', iconFocused: 'people' },
  { name: 'shop', title: 'Shop', icon: 'diamond-outline', iconFocused: 'diamond' },
];

function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16;
  const friendsBadge = useFriendsBadgeCount();
  return (
    <>
    <OfflineBanner />
    <Tabs
      sceneContainerStyle={{ backgroundColor: colors.bg }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        // textMid (#636E72) is dark gray — high contrast against the
        // white tab bar on iOS. The previous tabBarInactive (#B2BEC3)
        // was so faint users reported the icons as invisible.
        tabBarInactiveTintColor: colors.textMid,
        tabBarShowLabel: false,
        contentStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: 54 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const badge = tab.name === 'friends' && friendsBadge > 0 ? friendsBadge : undefined;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            listeners={{
              tabPress: () => { if (!isWeb) Haptics.selectionAsync(); },
            }}
            options={{
              title: tab.title,
              tabBarBadge: badge,
              tabBarBadgeStyle: {
                backgroundColor: colors.wrong,
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
                minWidth: 16,
                height: 16,
                lineHeight: 16,
                paddingHorizontal: 4,
              },
              // Stock pattern — exactly matches Expo's official bottom-tabs
              // examples. Receives `color` (active/inactive tint resolved by
              // React Navigation) and `size` from the navigator. No wrapping
              // View, no hardcoded color — this is the combination known to
              // render the font-glyph icons correctly on iOS production
              // builds.
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={size ?? 26}
                  color={color}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
    </>
  );
}

export default TabLayout;
