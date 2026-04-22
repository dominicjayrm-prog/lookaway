import React, { useEffect, useRef, useState, useCallback } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Animated as RNAnimated, Pressable } from 'react-native';
import { AchievementIcon } from './AchievementIcon';
import { TIER_COLORS, type AchievementUnlock } from '@/src/utils/achievements';

const GEM = String.fromCodePoint(0x1f48e);

interface AchievementToastProps {
  unlocks: AchievementUnlock[];
  onDismiss: () => void;
  onTap?: () => void;
}

function SingleToast({ unlock, onDismiss, onTap }: { unlock: AchievementUnlock; onDismiss: () => void; onTap?: () => void }) {
  const translateY = useRef(new RNAnimated.Value(-100)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const tierColor = TIER_COLORS[unlock.tier];
  const tierLabel = unlock.tier.charAt(0).toUpperCase() + unlock.tier.slice(1);

  return (
    <RNAnimated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <Pressable style={styles.toastInner} onPress={onTap}>
        <View style={[styles.tierStripe, { backgroundColor: tierColor }]} />
        <View style={[styles.iconBg, { backgroundColor: `${tierColor}15` }]}>
          <AchievementIcon name={unlock.icon} color={tierColor} size={20} />
        </View>
        <View style={styles.toastContent}>
          <Text style={styles.toastTitle}>{t('modals.achievement_unlocked')}</Text>
          <Text style={styles.toastName}>{unlock.achievementName} —{tierLabel}</Text>
          <Text style={styles.toastDesc}>{unlock.description} ·<Text style={styles.toastGems}>+{unlock.gems} gems {GEM}</Text></Text>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
}

export function AchievementToast({ unlocks, onDismiss, onTap }: AchievementToastProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const handleDismissCurrent = useCallback(() => {
    if (currentIdx + 1 < Math.min(unlocks.length, 3)) {
      setCurrentIdx(prev => prev + 1);
    } else {
      onDismiss();
    }
  }, [currentIdx, unlocks.length, onDismiss]);

  if (unlocks.length === 0) return null;

  if (currentIdx >= 2 && unlocks.length > 3) {
    return <BatchToast count={unlocks.length - 2} onDismiss={onDismiss} onTap={onTap} />;
  }

  const current = unlocks[currentIdx];
  if (!current) return null;

  return <SingleToast key={currentIdx} unlock={current} onDismiss={handleDismissCurrent} onTap={onTap} />;
}

function BatchToast({ count, onDismiss, onTap }: { count: number; onDismiss: () => void; onTap?: () => void }) {
  const translateY = useRef(new RNAnimated.Value(-100)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RNAnimated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <Pressable style={styles.toastInner} onPress={onTap}>
        <View style={[styles.tierStripe, { backgroundColor: '#D4A012' }]} />
        <View style={styles.toastContent}>
          <Text style={styles.toastTitle}>And {count} more achievement{count !== 1 ? 's' : ''}!</Text>
          <Text style={styles.toastDesc}>{t('modals.check_profile')}</Text>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999 },
  toastInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, paddingLeft: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8, overflow: 'hidden' },
  tierStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  iconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 11, fontWeight: '800', color: '#D4A012', letterSpacing: 0.3, marginBottom: 1 },
  toastName: { fontSize: 14, fontWeight: '700', color: '#1A1A18', marginBottom: 2 },
  toastDesc: { fontSize: 11, color: '#636E72' },
  toastGems: { color: '#00B894', fontWeight: '700' },
});
