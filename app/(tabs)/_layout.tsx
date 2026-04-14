import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
        // The default inactive color (#B2BEC3 light / #7A7890 dark) is
        // so faint on a white tab bar it reads as invisible to some
        // users. Use textMid for strong contrast against tabBar bg.
        tabBarInactiveTintColor: colors.textMid,
        tabBarShowLabel: false,
        // contentStyle applies to each tab's content container — prevents
        // a brief system-default (white) flash between tab transitions
        // on iOS when in dark mode.
        contentStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          // Explicit top border so the tab bar is always visually
          // distinct from page content. Subtle shadows alone weren't
          // enough to delineate the bar on iOS in light mode where
          // tabBar (#FFFFFF) sits against bg (#F7F6F3) — the 3% delta
          // plus a 0.06 shadow was effectively invisible.
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
              tabBarIcon: ({ focused }) => (
                <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accentSoft }] : styles.inactiveIconContainer}>
                  <Ionicons
                    name={focused ? tab.iconFocused : tab.icon}
                    size={24}
                    color={focused ? colors.accent : colors.textMid}
                  />
                </View>
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
const styles = StyleSheet.create({
  activeIconContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inactiveIconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
});
