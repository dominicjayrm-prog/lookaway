import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.06)',
          height: 80,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.medium,
          marginTop: 2,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? iconStyles.activeContainer : iconStyles.inactiveContainer}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={size}
                  color={focused ? colors.accent : colors.textLight}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const iconStyles = StyleSheet.create({
  activeContainer: {
    backgroundColor: 'rgba(108,92,231,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inactiveContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
