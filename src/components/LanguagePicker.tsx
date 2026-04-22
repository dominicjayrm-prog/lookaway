/**
 * Language picker sheet. Opened from Settings → Preferences → Language.
 *
 * Three options:
 *   • Automatic — follow device locale
 *   • English
 *   • Español
 *
 * Writes to `preferredLanguage` in the store, which (a) flips the
 * i18n locale synchronously for instant UI re-render, (b) persists
 * to AsyncStorage, (c) syncs to Supabase so the pick follows the
 * user across devices.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { haptics } from '@/src/lib/haptics';
import { t, type LanguagePreference } from '@/src/i18n';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

interface OptionDef {
  value: LanguagePreference;
  labelKey: string;
  helpKey?: string;
}

const OPTIONS: OptionDef[] = [
  { value: 'system', labelKey: 'settings.preferences.language.option_system', helpKey: 'settings.preferences.language.option_system_help' },
  { value: 'en', labelKey: 'settings.preferences.language.option_en' },
  { value: 'es', labelKey: 'settings.preferences.language.option_es' },
];

function LanguagePickerComponent({ visible, onDismiss }: Props) {
  const { colors } = useTheme();
  const preferred = useGameStore((s) => s.preferredLanguage);
  const setPreferred = useGameStore((s) => s.setPreferredLanguage);

  function handlePick(value: LanguagePreference) {
    if (value !== preferred) {
      haptics.impact(Haptics.ImpactFeedbackStyle.Light);
      setPreferred(value);
    } else {
      haptics.selection();
    }
    onDismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable style={st.backdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('modals.close_language')} />
      <View style={[st.sheetWrap, { backgroundColor: colors.card }]} pointerEvents="box-none">
        <SafeAreaView edges={['bottom']}>
          <View style={st.handle} />
          <Text style={[st.title, { color: colors.text }]}>{t('settings.preferences.language.picker_title')}</Text>
          <Text style={[st.body, { color: colors.textMid }]}>{t('settings.preferences.language.picker_body')}</Text>
          <View style={st.options}>
            {OPTIONS.map((opt) => {
              const selected = opt.value === preferred;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handlePick(opt.value)}
                  style={({ pressed }) => [
                    st.row,
                    { borderColor: colors.border, backgroundColor: selected ? colors.accentSoft : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(opt.labelKey)}
                >
                  <View style={st.rowText}>
                    <Text style={[st.rowLabel, { color: colors.text }]}>{t(opt.labelKey)}</Text>
                    {opt.helpKey && (
                      <Text style={[st.rowHelp, { color: colors.textMid }]}>{t(opt.helpKey)}</Text>
                    )}
                  </View>
                  {selected && <Ionicons name="checkmark" size={22} color={colors.accent} />}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export const LanguagePicker = React.memo(LanguagePickerComponent);

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 10,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)', marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  options: { gap: 8, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowHelp: { fontSize: 12, marginTop: 2 },
});
