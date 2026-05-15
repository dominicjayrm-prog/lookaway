/**
 * Save Your Account — upgrade flow for guest users.
 *
 * Reached from:
 *   - Settings → "Save your account" entry (visible only when isGuest)
 *   - UpgradeSheet → "Save your account" CTA on any contextual prompt
 *
 * Critical product framing:
 *   - This is NOT signup. The Supabase UUID never changes — we're
 *     attaching credentials to the existing anonymous account so
 *     every FK to user_id (progress, purchases, friendships, streak)
 *     stays valid. The copy must reinforce "you're keeping what you
 *     have" rather than "you're starting fresh".
 *
 *   - The "what you're saving" preview at the top is the trust
 *     mechanism. Without it, players assume creating an account
 *     means losing their guest progress and bounce.
 *
 *   - Apple Sign In is the prominent path on iOS (one tap, no
 *     typing). Email/password is a deliberate fallback below.
 *
 *   - Cancellation must always exit cleanly back to where the user
 *     came from — never block the guest from continuing as a guest.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useAuth, GUEST_USERNAME_PREFIX } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { checkUsername } from '@/src/utils/profanityFilter';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';
import { t } from '@/src/i18n';
import { log } from '@/src/lib/logger';

function SaveAccountScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user, isGuest, upgradeFromGuest, upgradeFromGuestWithApple } = useAuth();

  // Pull live progress numbers for the "what you're saving" card. Read
  // from the store rather than Supabase — store is already hydrated by
  // the time this screen mounts, and the values are what the user
  // visibly sees elsewhere in the app (no surprise discrepancies).
  const gems = useGameStore((s) => s.gems);
  const totalStars = useGameStore((s) => s.totalStars);
  const streakCount = useGameStore((s) => s.streakCount);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'disallowed'>('idle');
  const [usernameDisallowedMessage, setUsernameDisallowedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // Defensive guard: if this screen ever loads for a non-guest user
  // (deep link, back-stack quirk, or upgrade succeeded but the user
  // hit Back) just bounce them out. Upgrading a non-guest is a no-op
  // and the form would silently fail.
  useEffect(() => {
    if (user && !isGuest) {
      router.replace('/');
    }
  }, [user, isGuest, router]);

  // Debounced username availability check. Same logic as the signup
  // form so guests get the same profanity / reserved / available
  // feedback — using the shared util here would be ideal long-term.
  useEffect(() => {
    setUsernameDisallowedMessage(null);
    if (username.length === 0) { setUsernameStatus('idle'); return; }
    if (username.length < 3) { setUsernameStatus('invalid'); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { setUsernameStatus('invalid'); return; }
    const profanityCheck = checkUsername(username);
    if (!profanityCheck.ok) {
      setUsernameStatus('disallowed');
      setUsernameDisallowedMessage(profanityCheck.message ?? t('auth.choose_different_username'));
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        // Exclude the current user from the "taken" check — their
        // own placeholder `player_xxxx` username collides on a
        // case-insensitive index otherwise, which would block them
        // from ever upgrading without changing the placeholder first.
        .neq('id', user?.id ?? '')
        .single();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 300);
    return () => clearTimeout(handle);
  }, [username, user?.id]);

  const handleUsernameChange = (text: string) => {
    const sanitized = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
    setUsername(sanitized);
  };

  const handleEmailSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError(t('auth.fill_all_fields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.password_too_short'));
      return;
    }
    if (usernameStatus !== 'available') {
      if (usernameStatus === 'disallowed') {
        setError(usernameDisallowedMessage ?? t('auth.choose_different_username'));
      } else {
        setError(t('auth.choose_available_username'));
      }
      return;
    }
    if (!consent) {
      setError(t('auth.accept_tos'));
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await upgradeFromGuest(email.trim(), password, username.trim());
    setLoading(false);

    if (result.error === 'email_taken') {
      // The user typed an email that already has a real Blanked
      // account on it. Walking them into that other account would
      // orphan their guest progress, so warn explicitly and let them
      // back out. Manual support-side merge is the only safe recovery.
      Alert.alert(
        t('save_account.email_taken_title'),
        t('save_account.email_taken_body'),
        [{ text: t('common.ok'), style: 'default' }],
      );
      return;
    }
    if (result.error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(result.error === 'profile_update_failed'
        ? t('save_account.profile_failed')
        : result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    log.breadcrumb('auth', 'guest upgraded via email');
    router.replace('/');
  };

  const handleApplePress = async () => {
    if (!consent) {
      setError(t('auth.accept_tos'));
      return;
    }
    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Pass the chosen username if the field is filled and available —
    // otherwise let the upgrade keep the existing placeholder so the
    // user can rename later in Settings without blocking the flow.
    const usernameToUse = usernameStatus === 'available' ? username.trim() : undefined;
    const result = await upgradeFromGuestWithApple(usernameToUse);
    setLoading(false);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/');
      return;
    }
    if (result.reason === 'cancelled') return;
    if (result.message === 'email_taken') {
      Alert.alert(
        t('save_account.apple_taken_title'),
        t('save_account.apple_taken_body'),
        [{ text: t('common.ok'), style: 'default' }],
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setError(result.message === 'profile_update_failed'
      ? t('save_account.profile_failed')
      : result.message);
  };

  const handleDismiss = () => {
    Haptics.selectionAsync().catch(() => {});
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close button — never trap the guest. They can always
              back out and keep playing as a guest. */}
          <View style={styles.topBar}>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={24} color={colors.textMid} />
            </Pressable>
          </View>

          <View style={styles.heroSection}>
            <AnimatedBlink expression="love" size={72} entrance="spring" entranceDelay={150} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('save_account.title')}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMid }]}>{t('save_account.subtitle')}</Text>
          </View>

          {/* "What you're saving" preview card. The trust mechanism.
              Pull live store values so the numbers match what the
              user sees on every other screen in the app. */}
          <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.previewLabel, { color: colors.textMid }]}>{t('save_account.preview_label')}</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <View style={[styles.previewIconBg, { backgroundColor: colors.goldSoft }]}>
                  <Ionicons name="star" size={18} color={colors.gold} />
                </View>
                <Text style={[styles.previewValue, { color: colors.text }]}>{totalStars}</Text>
                <Text style={[styles.previewKey, { color: colors.textMid }]}>{t('save_account.preview_stars')}</Text>
              </View>
              <View style={styles.previewItem}>
                <View style={[styles.previewIconBg, { backgroundColor: colors.wrongSoft }]}>
                  <Ionicons name="flame" size={18} color={colors.wrong} />
                </View>
                <Text style={[styles.previewValue, { color: colors.text }]}>{streakCount}</Text>
                <Text style={[styles.previewKey, { color: colors.textMid }]}>{t('save_account.preview_streak')}</Text>
              </View>
              <View style={styles.previewItem}>
                <View style={[styles.previewIconBg, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="diamond" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.previewValue, { color: colors.text }]}>{gems}</Text>
                <Text style={[styles.previewKey, { color: colors.textMid }]}>{t('save_account.preview_gems')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            {/* Consent stays at the top because both Apple and email
                paths need it. Don't route the user through Apple's
                native sheet only to bounce on consent failure — they
                lose the sheet's "this is fine" context. */}
            <Pressable
              onPress={() => setConsent((v) => !v)}
              style={styles.consentRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              accessibilityLabel={t('modals.i_agree_tos_aria')}
            >
              <View style={[styles.checkbox, { backgroundColor: consent ? colors.accent : 'transparent', borderColor: consent ? colors.accent : colors.borderStrong }]}>
                {consent && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.consentText, { color: colors.textMid }]}>
                {t('auth.consent_prefix')}{' '}
                <Text
                  style={[styles.consentLink, { color: colors.accent }]}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/terms'); }}
                >
                  {t('auth.consent_terms')}
                </Text>
                {' '}{t('auth.consent_and')}{' '}
                <Text
                  style={[styles.consentLink, { color: colors.accent }]}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/privacy'); }}
                >
                  {t('auth.consent_privacy')}
                </Text>
              </Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <View style={styles.socialSection}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={borderRadius.md}
                  style={styles.appleButton}
                  onPress={handleApplePress}
                />
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textLight }]}>{t('auth.or_email')}</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.username')}</Text>
              <View style={[styles.usernameRow, { backgroundColor: colors.surface }]}>
                <Text style={[styles.atPrefix, { color: colors.textMid }]}>@</Text>
                <TextInput
                  style={[styles.usernameInput, { color: colors.text }]}
                  placeholder={t('save_account.username_placeholder')}
                  placeholderTextColor={colors.textLight}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {usernameStatus === 'available' && <Text style={styles.usernameAvailable}>{t('auth.available')}</Text>}
              {usernameStatus === 'taken' && <Text style={styles.usernameTaken}>{t('auth.taken')}</Text>}
              {usernameStatus === 'invalid' && <Text style={[styles.usernameHint, { color: colors.textLight }]}>{t('save_account.username_hint')}</Text>}
              {usernameStatus === 'disallowed' && <Text style={styles.usernameTaken}>{usernameDisallowedMessage ?? t('auth.choose_different_username')}</Text>}
              {usernameStatus === 'checking' && <Text style={[styles.usernameHint, { color: colors.textLight }]}>{t('auth.checking')}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: focusedField === 'email' ? colors.accent : 'transparent' }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth_misc.password_label')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: focusedField === 'password' ? colors.accent : 'transparent' }]}
                placeholder={t('common.password_placeholder')}
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleEmailSubmit}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.wrong }]}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.accent }, (loading || !consent) && styles.buttonDisabled]}
              onPress={handleEmailSubmit}
              disabled={loading || !consent}
              accessibilityRole="button"
              accessibilityLabel={t('save_account.submit_aria')}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('save_account.submit')}</Text>
              )}
            </Pressable>
          </View>

          {/* Soft exit. Never punish the user for backing out — they
              keep playing as a guest with all the same progress. */}
          <Pressable
            onPress={handleDismiss}
            disabled={loading}
            style={({ pressed }) => [styles.notNowBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.not_now')}
          >
            <Text style={[styles.notNowText, { color: colors.textMid }]}>{t('common.not_now')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SaveAccountScreen;

// Suppress unused-import warning for the placeholder constant. We
// expose it from AuthProvider for future use (e.g. detecting when to
// pre-fill an empty username for a guest who hasn't renamed yet) but
// don't actually need to consume it on this screen — the empty input
// state handles that case implicitly.
void GUEST_USERNAME_PREFIX;

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', height: 44 },
  closeBtn: { padding: spacing.xs },
  heroSection: { alignItems: 'center', marginBottom: spacing.xxl, gap: spacing.sm },
  heroTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  heroSubtitle: { fontSize: typography.sizes.md, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 22 },
  previewCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xl, ...shadows.card },
  previewLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.md, textAlign: 'center' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  previewItem: { alignItems: 'center', gap: 4, flex: 1 },
  previewIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  previewValue: { fontSize: 20, fontWeight: '800' },
  previewKey: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  formCard: { borderRadius: borderRadius.xl, padding: spacing.xxl, ...shadows.card },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.lg, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 18 },
  consentLink: { fontWeight: '700', textDecorationLine: 'underline' },
  socialSection: { marginBottom: spacing.lg },
  appleButton: { width: '100%', height: 52 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  inputContainer: { marginBottom: spacing.lg },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '600', marginBottom: spacing.sm },
  input: { borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: typography.sizes.lg, borderWidth: 1.5, borderColor: 'transparent' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  atPrefix: { fontSize: typography.sizes.lg, fontWeight: '600', marginRight: 2 },
  usernameInput: { flex: 1, fontSize: typography.sizes.lg, paddingVertical: 0 },
  usernameAvailable: { fontSize: 12, fontWeight: '600', color: '#00B894', marginTop: 4 },
  usernameTaken: { fontSize: 12, fontWeight: '600', color: '#FF6B6B', marginTop: 4 },
  usernameHint: { fontSize: 12, marginTop: 4 },
  errorContainer: { backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { fontSize: typography.sizes.sm, textAlign: 'center' },
  primaryButton: { borderRadius: borderRadius.md, paddingVertical: 16, paddingHorizontal: spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 52, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  notNowBtn: { paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  notNowText: { fontSize: typography.sizes.md, fontWeight: '600' },
});
