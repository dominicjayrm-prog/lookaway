/**
 * Sound & Haptics settings screen.
 *
 * Replaces the single "Sound effects" switch on the main Settings
 * screen with a dedicated screen where the player can fine-tune:
 *
 *  - Master sound toggle
 *  - Category toggles: UI, Gameplay, Rewards
 *    (each category maps to a subset of SoundName in sounds.ts)
 *  - Haptic feedback toggle (routed through the new haptics manager
 *    in src/lib/haptics.ts so the flag actually takes effect)
 *  - A "Preview" button next to each category that plays a sample
 *    sound so the player can confirm audio is working before a game.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import { sounds, type SoundPreferences } from '@/src/lib/sounds';
import { haptics } from '@/src/lib/haptics';
import * as Haptics from 'expo-haptics';

interface CategoryRow {
  key: keyof Omit<SoundPreferences, 'master'>;
  icon: string;
  label: string;
  description: string;
  previewSound: 'tap' | 'correct' | 'starPop';
}

const CATEGORIES: CategoryRow[] = [
  { key: 'ui', icon: '\u270B', label: 'Interface sounds', description: 'Button taps, transitions, menu navigation', previewSound: 'tap' },
  { key: 'gameplay', icon: '\uD83C\uDFAE', label: 'Gameplay feedback', description: 'Correct / wrong answers, timers, power-ups', previewSound: 'correct' },
  { key: 'rewards', icon: '\u2728', label: 'Rewards & celebrations', description: 'Stars, gems, level complete, streak milestones', previewSound: 'starPop' },
];

export default function SoundSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [prefs, setPrefs] = useState<SoundPreferences>(() => sounds.getPreferences());
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => haptics.isEnabled());

  // Re-read on mount (haptics preference loads from AsyncStorage
  // asynchronously via haptics.init()).
  useEffect(() => {
    haptics.init().then(() => setHapticsOn(haptics.isEnabled()));
  }, []);

  const togglePref = useCallback(<K extends keyof SoundPreferences>(key: K, value: SoundPreferences[K]) => {
    sounds.setPreference(key, value);
    setPrefs(sounds.getPreferences());
  }, []);

  const toggleHaptics = useCallback((value: boolean) => {
    haptics.setEnabled(value);
    setHapticsOn(value);
    // Little sample so the user feels the change immediately.
    if (value) haptics.impact(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const preview = useCallback((name: 'tap' | 'correct' | 'starPop') => {
    // Bypass category check temporarily — the preview button is a
    // deliberate opt-in, so we want it to play even if the category
    // is muted, using a raw player call isn't trivial here so we
    // just flip master briefly if needed. Simpler: if master is off
    // nothing plays; users can enable master first.
    sounds.play(name);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to settings"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Sound & Haptics</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors.textMid }]}>
          Tune which sounds you hear and whether your device vibrates on key moments.
        </Text>

        {/* Master toggle */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '700' }]}>All sounds</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>Master toggle — turns every sound off</Text>
            </View>
            <Switch
              value={prefs.master}
              onValueChange={(v) => togglePref('master', v)}
              trackColor={{ true: colors.accent, false: colors.surface }}
            />
          </View>
        </Card>

        {/* Category toggles */}
        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>CATEGORIES</Text>
        <Card style={styles.card}>
          {CATEGORIES.map((cat, i) => {
            const enabled = prefs.master && prefs[cat.key];
            return (
              <React.Fragment key={cat.key}>
                <View style={[styles.row, !prefs.master && { opacity: 0.4 }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <View style={styles.catText}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{cat.label}</Text>
                    <Text style={[styles.rowHelp, { color: colors.textLight }]}>{cat.description}</Text>
                  </View>
                  <Pressable
                    onPress={() => preview(cat.previewSound)}
                    hitSlop={10}
                    disabled={!enabled}
                    style={[styles.previewBtn, { backgroundColor: enabled ? colors.accentSoft : colors.surface, opacity: enabled ? 1 : 0.5 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Preview ${cat.label}`}
                  >
                    <Ionicons name="play" size={12} color={enabled ? colors.accent : colors.textLight} />
                  </Pressable>
                  <Switch
                    value={prefs[cat.key]}
                    onValueChange={(v) => togglePref(cat.key, v)}
                    disabled={!prefs.master}
                    trackColor={{ true: colors.accent, false: colors.surface }}
                  />
                </View>
                {i < CATEGORIES.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </Card>

        {/* Haptics */}
        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>HAPTICS</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.catIcon}>{'\uD83D\uDCF3'}</Text>
            <View style={styles.catText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic feedback</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>Subtle vibration on taps, correct/wrong answers, and level complete</Text>
            </View>
            <Switch
              value={hapticsOn}
              onValueChange={toggleHaptics}
              trackColor={{ true: colors.accent, false: colors.surface }}
            />
          </View>
        </Card>

        <Text style={[styles.footer, { color: colors.textLight }]}>
          Tip: keep Gameplay and Rewards on even if you mute Interface sounds — they make correct answers and level clears feel more satisfying.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  scroll: { paddingBottom: 40 },
  intro: { fontSize: typography.sizes.md, marginBottom: spacing.lg, lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm, paddingLeft: 4 },
  card: { marginBottom: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.sm },
  rowLabel: { fontSize: typography.sizes.lg },
  rowHelp: { fontSize: 12, marginTop: 2 },
  catIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  catText: { flex: 1 },
  previewBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginVertical: spacing.xs },
  footer: { fontSize: 12, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg, lineHeight: 18 },
});
