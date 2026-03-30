import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}[] = [
  { name: 'index', title: 'Play', icon: 'play-circle-outline', iconFocused: 'play-circle' },
  { name: 'journey', title: 'Journey', icon: 'map-outline', iconFocused: 'map' },
  { name: 'daily', title: 'Daily', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'shop', title: 'Shop', icon: 'diamond-outline', iconFocused: 'diamond' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: 80,
          paddingBottom: 28,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accentSoft }] : styles.inactiveIconContainer}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={22}
                  color={focused ? colors.accent : colors.tabBarInactive}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  inactiveIconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
});
