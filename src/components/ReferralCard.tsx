/**
 * ReferralCard — Beautiful referral invite card with code display and share button.
 * Shows on the Friends tab.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Clipboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  getMyReferralCode,
  shareReferralLink,
  getReferralStats,
  REFERRAL_REWARD,
  type ReferralStats,
} from '@/src/utils/referral';
import { log } from '@/src/lib/logger';

function ReferralCard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({ totalReferred: 0, totalGemsEarned: 0 });
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    getMyReferralCode(userId).then(setCode).catch((e) => log.warn('referral', 'getMyReferralCode failed', { error: String(e) }));
    getReferralStats(userId).then(setStats).catch((e) => log.warn('referral', 'getReferralStats failed', { error: String(e) }));
    // Get username for share message
    (async () => {
      try {
        const { supabase } = require('@/src/lib/supabase');
        const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
        if (data?.username) setUsername(data.username);
      } catch {}
    })();
  }, [userId]);

  const handleCopy = useCallback(() => {
    if (!code) return;
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        navigator.clipboard.writeText(code);
      } else {
        Clipboard.setString(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);

  const handleShare = useCallback(() => {
    if (!code) return;
    shareReferralLink(code, username);
  }, [code, username]);

  if (!userId || !code) return null;

  return (
    <View style={[st.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={st.headerRow}>
        <View style={[st.iconBg, { backgroundColor: colors.correctSoft }]}>
          <Ionicons name="gift-outline" size={16} color={colors.correct} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: colors.text }]}>Invite friends, earn gems</Text>
          <Text style={[st.subtitle, { color: colors.textMid }]}>
            You both get {REFERRAL_REWARD} gems
          </Text>
        </View>
      </View>

      {/* Code display */}
      <View style={[st.codeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          <Text style={[st.codeLabel, { color: colors.textLight }]}>YOUR CODE</Text>
          <Text style={[st.codeText, { color: colors.text }]}>{code}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [st.copyBtn, { backgroundColor: copied ? colors.correctSoft : colors.accentSoft }, pressed && { opacity: 0.7 }]}
          onPress={handleCopy}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? colors.correct : colors.accent} />
          <Text style={[st.copyText, { color: copied ? colors.correct : colors.accent }]}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      {/* Share button */}
      <Pressable
        style={({ pressed }) => [st.shareBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
        onPress={handleShare}
      >
        <Ionicons name="share-outline" size={16} color="#FFF" />
        <Text style={st.shareBtnText}>{t('modals.share_invite')}</Text>
      </Pressable>

      {/* Stats */}
      {stats.totalReferred > 0 && (
        <View style={[st.statsRow, { borderTopColor: colors.border }]}>
          <Text style={[st.statsText, { color: colors.textMid }]}>
            {stats.totalReferred} friend{stats.totalReferred !== 1 ? 's' : ''} joined {'\u00B7'} {stats.totalGemsEarned} gems earned
          </Text>
        </View>
      )}
    </View>
  );
}

export default ReferralCard;

const st = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  iconBg: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  codeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  codeText: { fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  copyText: { fontSize: 12, fontWeight: '700' },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  statsRow: { borderTopWidth: 1, marginTop: 12, paddingTop: 10, alignItems: 'center' },
  statsText: { fontSize: 11, fontWeight: '600' },
});
