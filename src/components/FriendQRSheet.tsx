/**
 * FriendQRSheet — full-screen modal that shows the player's own QR code
 * so a nearby friend can scan it. Reads:
 *  - userId from `useAuth()`
 *  - equipped Blink expression from the game store (so the mascot in
 *     the centre of the QR reflects the player's customisation)
 *  - username from the `profiles` table (displayed under the QR)
 *
 * Slide-up animation matches the SubscriptionPaywall modal pattern so
 * the feel is consistent with the rest of the app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Platform,
  Animated as RNAnimated,
  Share,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { getExpressionById } from '@/src/data/cosmetics';
import { FriendQRCode, buildInviteUrl } from '@/src/components/FriendQRCode';
import type { BlinkExpression } from '@/src/components/Blink';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function FriendQRSheet({ visible, onDismiss }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id;
  const equippedExpression = useGameStore((s) => s.equippedExpression);
  const expressionCosmetic = getExpressionById(equippedExpression);
  const blinkExpression: BlinkExpression = expressionCosmetic?.blinkExpression ?? 'normal';

  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !visible) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
      });
  }, [userId, visible]);

  const slideAnim = useRef(new RNAnimated.Value(SH)).current;
  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 55,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    RNAnimated.timing(slideAnim, {
      toValue: SH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  // Swipe-down to dismiss.
  // We use the *Capture variants so that the responder intercepts the
  // gesture even when the touch starts on a child element (the QR card,
  // share button, username text). Without capture, a Pressable inside
  // would claim the touch first and the outer PanResponder would never
  // see the move events — which is exactly the "swipe down does nothing"
  // bug users reported.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.2) {
          handleClose();
        } else {
          RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const handleShareLink = async () => {
    if (!userId) return;
    try {
      await Share.share({
        message: `Add me on Blanked! ${buildInviteUrl(userId)}`,
      });
    } catch {}
  };

  if (!visible) return null;

  // QR sits in a card that fills most of the width with padding.
  const qrSize = Math.min(SW - 96, 280);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          st.root,
          { backgroundColor: colors.bg, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <SafeAreaView style={st.safe} edges={['bottom']}>
          {/* Apply top safe-area inset manually (not via SafeAreaView
              edges) and add extra breathing room so the close button
              sits well clear of the notch / status bar. On notchless
              devices insets.top is 20-ish, we still want visible space
              so we add a hard 16px gap. */}
          <View style={[st.header, { paddingTop: insets.top + 16 }]}>
            <Pressable
              onPress={handleClose}
              hitSlop={20}
              style={[st.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel={t('modals.close_qr')}
            >
              <Ionicons name="close" size={22} color={colors.textMid} />
            </Pressable>
            <Text style={[st.headerTitle, { color: colors.text }]}>{t('modals.your_qr')}</Text>
            <View style={st.closePlaceholder} />
          </View>

          <View style={st.content}>
            <View
              style={[
                st.qrCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOpacity: isDark ? 0.3 : 0.08,
                },
              ]}
            >
              {userId ? (
                <FriendQRCode
                  userId={userId}
                  expression={blinkExpression}
                  size={qrSize}
                  color={colors.text}
                  backgroundColor={colors.card}
                />
              ) : (
                <View style={{ width: qrSize, height: qrSize }} />
              )}
              {username && (
                <Text style={[st.username, { color: colors.text }]}>@{username}</Text>
              )}
              <Text style={[st.subtitle, { color: colors.textMid }]}>
                {t('social.qr_hint')}
              </Text>
            </View>

            <Pressable
              onPress={handleShareLink}
              style={({ pressed }) => [
                st.shareBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={st.shareText}>{t('modals.share_link_instead')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </RNAnimated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: '100%',
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePlaceholder: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  qrCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 8,
  },
  username: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  subtitle: { fontSize: 12, marginTop: 4 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
