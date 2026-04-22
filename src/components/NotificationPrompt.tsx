import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { Ionicons } from '@expo/vector-icons';

interface NotificationPromptProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function NotificationPrompt({ visible, onEnable, onDismiss }: NotificationPromptProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconBg, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="notifications" size={32} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{t('celebrations.notif_prompt_title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>Get notified when:</Text>

          <View style={styles.bulletList}>
            {[
              { icon: 'flame-outline' as const, text: 'Your streak is at risk' },
              { icon: 'people-outline' as const, text: 'A friend challenges you' },
              { icon: 'heart-outline' as const, text: 'Your lives are full' },
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name={item.icon} size={18} color={colors.accent} />
                <Text style={[styles.bulletText, { color: colors.text }]}>{item.text}</Text>
              </View>
            ))}
          </View>

          <Pressable style={[styles.enableBtn, { backgroundColor: colors.accent }]} onPress={onEnable}>
            <Text style={styles.enableText}>{t('celebrations.notif_prompt_enable')}</Text>
          </Pressable>

          <Pressable style={[styles.laterBtn, { backgroundColor: colors.surface }]} onPress={onDismiss}>
            <Text style={[styles.laterText, { color: colors.textMid }]}>{t('celebrations.notif_prompt_later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  iconBg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  bulletList: { width: '100%', gap: 12, marginBottom: 24, paddingHorizontal: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { fontSize: 15, fontWeight: '500' },
  enableBtn: { borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  enableText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  laterBtn: { borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  laterText: { fontSize: 15, fontWeight: '600' },
});
