import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import OfflineBanner from '@/src/components/OfflineBanner';
import { useFriendsBadgeCount } from '@/src/hooks/useFriendsBadgeCount';
import { t } from '@/src/i18n';

const isWeb = Platform.OS === 'web';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Tab titles resolve via t() inside the render fn below so
// the tab bar re-reads when the user flips language in Settings.
const TAB_CONFIG: {
  name: string;
  titleKey: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}[] = [
  { name: 'index', titleKey: 'tabs.play', icon: 'play-circle-outline', iconFocused: 'play-circle' },
  { name: 'journey', titleKey: 'tabs.journey', icon: 'map-outline', iconFocused: 'map' },
  { name: 'friends', titleKey: 'tabs.friends', icon: 'people-outline', iconFocused: 'people' },
  { name: 'shop', titleKey: 'tabs.shop', icon: 'diamond-outline', iconFocused: 'diamond' },
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        // textMid (#636E72) is dark gray — high contrast against the
        // white tab bar on iOS. The previous tabBarInactive (#B2BEC3)
        // was so faint users reported the icons as invisible.
        tabBarInactiveTintColor: colors.textMid,
        tabBarShowLabel: false,
        // Tabs has no scene/content style hook in this expo-router
        // version; each screen's root view sets its own background.
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
              title: t(tab.titleKey),
              // Eagerly mount the journey tab on app boot. The default
              // `lazy: true` defers mounting until the tab is first
              // focused, so on first tap the user sees the previous
              // tab's content for a frame while the 380-node journey
              // scene + its Reanimated worklets initialise — that's the
              // 'split-second buggy thingy'. Pre-mounting trades ~100ms
              // of extra cold-start work (invisible behind the splash)
              // for a clean instant journey-tab open.
              lazy: tab.name !== 'journey',
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
