/**
 * PowerUpViewer — Dedicated power-up inventory modal.
 * Shows all owned boosts grouped by game mode.
 */
import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ALL_POWERUPS, POWERUP_EMOJIS } from '@/src/data/powerUps';

const MODE_NAMES: Record<string, string> = {
  all: 'Universal',
  classic: 'Classic',
  speed_recall: 'Speed Recall',
  snap_match: 'Snap Match',
  sequence: 'Sequence',
  counting_blitz: 'Counting Blitz',
  colour_chain: 'Colour Chain',
};

const MODE_COLORS: Record<string, string> = {
  all: '#636E72',
  classic: '#6C5CE7',
  speed_recall: '#FF6B6B',
  snap_match: '#0984E3',
  sequence: '#D4A012',
  counting_blitz: '#00B894',
  colour_chain: '#FD79A8',
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

function PowerUpViewerComponent({ visible, onDismiss }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const powerUps = useGameStore(s => s.powerUps);

  // Group power-ups by mode with counts
  const modes = ['all', 'classic', 'speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];
  const groups = modes.map(mode => {
    const items = ALL_POWERUPS
      .filter(p => p.modes.includes(mode))
      .map(p => ({ ...p, count: (powerUps as any)[p.id] ?? 0 }))
      .filter(p => p.count > 0);
    return { mode, name: MODE_NAMES[mode] ?? mode, color: MODE_COLORS[mode] ?? '#636E72', items };
  }).filter(g => g.items.length > 0);

  const totalBoosts = groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.count, 0), 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={st.backdrop}>
        <Pressable style={st.backdropTouch} onPress={onDismiss} />
        <View style={[st.sheet, { backgroundColor: colors.bg, maxWidth: Platform.OS === 'web' ? 430 : undefined }]}>
          <View style={st.handle} />
          <Text style={[st.title, { color: colors.text }]}>{t('powerups_ui.your_power_ups')}</Text>
          <Text style={[st.subtitle, { color: colors.textLight }]}>{totalBoosts} boost{totalBoosts !== 1 ? 's' : ''} available</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {groups.length === 0 ? (
              <View style={[st.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="flash-outline" size={32} color={colors.textLight} />
                <Text style={[st.emptyText, { color: colors.textLight }]}>{t('powerups_ui.no_power_ups')}</Text>
                <Text style={[st.emptyHint, { color: colors.textLight }]}>{t('modals.powerup_empty_hint')}</Text>
              </View>
            ) : (
              groups.map(g => (
                <View key={g.mode} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <View style={[st.modeDot, { backgroundColor: g.color }]} />
                    <Text style={[st.modeLabel, { color: colors.text }]}>{g.name}</Text>
                  </View>
                  {g.items.map(item => (
                    <View key={item.id} style={[st.itemRow, { backgroundColor: colors.card }]}>
                      <Text style={st.itemEmoji}>{(POWERUP_EMOJIS as any)?.[item.id] ?? '⚡'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.itemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[st.itemDesc, { color: colors.textLight }]}>{item.description}</Text>
                      </View>
                      <View style={[st.countBadge, { backgroundColor: g.color + '18' }]}>
                        <Text style={[st.countText, { color: g.color }]}>{item.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}

            <Pressable onPress={() => { onDismiss(); router.push('/(tabs)/shop'); }} style={[st.shopBtn, { backgroundColor: colors.accent }]}>
              <Text style={st.shopBtnText}>{t('modals.get_more_shop')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const PowerUpViewer = React.memo(PowerUpViewerComponent);

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '75%', alignSelf: 'center', width: '100%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  subtitle: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  emptyState: { alignItems: 'center', padding: 28, borderRadius: 16, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 12, textAlign: 'center' },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeLabel: { fontSize: 12, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 6 },
  itemEmoji: { fontSize: 20 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemDesc: { fontSize: 10, marginTop: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, minWidth: 32, alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '800' },
  shopBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  shopBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
