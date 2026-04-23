/**
 * CosmeticPicker — Reusable bottom-sheet for equipping owned cosmetics.
 * Shows owned items (tappable) and locked items (greyed, view-only).
 * No purchasing — that's shop-only.
 */
import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { RARITY_COLORS, sortByRarity, type Cosmetic } from '@/src/data/cosmetics';

interface CosmeticPickerProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  ownedItems: Cosmetic[];
  lockedItems: Cosmetic[];
  equippedId: string;
  onEquip: (id: string) => void;
  renderPreview: (item: Cosmetic) => React.ReactNode;
}

function CosmeticPickerComponent({
  visible,
  onDismiss,
  title,
  ownedItems,
  lockedItems,
  equippedId,
  onEquip,
  renderPreview,
}: CosmeticPickerProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const totalCount = ownedItems.length + lockedItems.length;
  // Sort by rarity: common (top-left) → legendary (bottom-right)
  const sortedOwned = sortByRarity(ownedItems);
  const sortedLocked = sortByRarity(lockedItems);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={st.backdrop}>
        <Pressable style={st.backdropTouch} onPress={onDismiss} />
        <View style={[st.sheet, { backgroundColor: colors.bg, maxWidth: Platform.OS === 'web' ? 430 : undefined }]}>
          <View style={[st.handle, { backgroundColor: colors.borderStrong }]} />
          <Text style={[st.title, { color: colors.text }]}>{title}</Text>
          <Text style={[st.counter, { color: colors.textLight }]}>{t('modals.collected_count', { owned: ownedItems.length, total: totalCount })}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Owned items */}
            {ownedItems.length > 0 && (
              <>
                <Text style={[st.sectionLabel, { color: colors.textMid }]}>{t('modals.owned_section')}</Text>
                <View style={st.grid}>
                  {sortedOwned.map(item => {
                    const equipped = item.id === equippedId;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => { onEquip(item.id); onDismiss(); }}
                        style={[st.card, { backgroundColor: colors.card, borderColor: equipped ? colors.accent : colors.border }]}
                      >
                        {renderPreview(item)}
                        <Text style={[st.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ fontSize: 8, color: RARITY_COLORS[item.rarity], fontWeight: '600' }}>{t(`social.rarity_${item.rarity}`)}</Text>
                        {equipped && <Text style={[st.equippedLabel, { color: colors.correct }]}>{t('modals.equipped')}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Locked items */}
            {lockedItems.length > 0 && (
              <>
                <Text style={[st.sectionLabel, { color: colors.textLight, marginTop: 16 }]}>{t('modals.locked_section')}</Text>
                <View style={st.grid}>
                  {sortedLocked.map(item => (
                    <View key={item.id} style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.4 }]}>
                      <View style={{ position: 'relative' }}>
                        {renderPreview(item)}
                        <View style={st.lockOverlay}>
                          <Ionicons name="lock-closed" size={14} color="#FFF" />
                        </View>
                      </View>
                      <Text style={[st.cardName, { color: colors.textLight }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 8, color: RARITY_COLORS[item.rarity], fontWeight: '600' }}>{t(`social.rarity_${item.rarity}`)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Browse shop link */}
            {lockedItems.length > 0 && (
              <Pressable onPress={() => { onDismiss(); router.push('/(tabs)/shop'); }} style={[st.shopLink, { borderColor: colors.accent }]}>
                <Ionicons name="cart" size={16} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{t('modals.browse_shop')}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const CosmeticPicker = React.memo(CosmeticPickerComponent);

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '80%', alignSelf: 'center', width: '100%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  counter: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30%', flexGrow: 1, alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1.5 },
  cardName: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  equippedLabel: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 999 },
  shopLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginTop: 20 },
});
