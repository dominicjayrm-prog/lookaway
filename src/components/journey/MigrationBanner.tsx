import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  unifiedPosition: number;
  onDismiss: () => void;
}

/** Dismissible banner shown ONCE to existing users after the unified
 *  journey rolls out. Explains that their progress is intact, points
 *  them at their computed starting position. */
export function MigrationBanner({ unifiedPosition, onDismiss }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[st.banner, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '33' }]}>
      <Ionicons name="sparkles" size={18} color={colors.accent} />
      <View style={st.body}>
        <Text style={[st.title, { color: colors.text }]}>
          {t('journey.migration_title')}
        </Text>
        <Text style={[st.sub, { color: colors.textMid }]}>
          {t('journey.migration_sub', { position: unifiedPosition })}
        </Text>
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('journey.migration_dismiss_aria')}
      >
        <Ionicons name="close" size={18} color={colors.textMid} />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
  },
});
