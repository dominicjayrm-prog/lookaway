/**
 * Forgot password screen — entry point of the reset flow.
 *
 * Flow:
 *  1. User enters their account email
 *  2. We call supabase.auth.resetPasswordForEmail() with a
 *     redirectTo pointing back at blanked:// deep link
 *  3. Supabase sends the email (via the Resend-backed custom SMTP
 *     we configured — FROM hello@playblanked.com)
 *  4. User opens email, taps the link, their browser/iOS hands
 *     the deep link back to the app, Supabase fires
 *     onAuthStateChange('PASSWORD_RECOVERY')
 *  5. DeepLinkHandler in _layout.tsx routes to /reset-password
 *
 * On this screen we always land on a "Check your email" success
 * state after submit, even if the email doesn't exist — Supabase
 * behaves the same way to avoid leaking whether an account exists.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlankedLogo } from '@/src/components/BlankedLogo';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

/** Deep-link target the reset email will redirect to. Matches the
 *  custom URL scheme declared in app.json (`"scheme": "blanked"`).
 *  iOS opens this scheme in the Blanked app; Android + web fall
 *  back to an https equivalent we configure in the email template. */
const RESET_REDIRECT_URL = 'blanked://reset-password';

function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address');
      return;
    }
    // Loose shape check — a proper email regex isn't worth the noise.
    if (!trimmed.includes('@')) {
      setError('That doesn\u2019t look like an email address');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: RESET_REDIRECT_URL,
    });
    setLoading(false);
    // Even on error we show the success screen to avoid leaking
    // whether an account exists — but log real failures.
    if (err) {
      // eslint-disable-next-line no-console
      console.warn('resetPasswordForEmail error:', err.message);
    }
    setSent(true);
  };

  // Success state: same regardless of whether the email was real.
  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <BlankedLogo size={64} />
          <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.successBody, { color: colors.textMid }]}>
            If an account exists for {email.trim()}, we\u2019ve sent a password reset link from hello@playblanked.com. Tap the link in the email to set a new password.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => { setSent(false); setEmail(''); }}
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Send to a different email"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textMid }]}>Send to a different email</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <BlankedLogo size={56} />
          <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>
            Enter the email you signed up with. We\u2019ll send you a link to set a new password.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.wrong }]}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Send reset link"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Send reset link</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: typography.sizes.md, lineHeight: 22 },
  inputContainer: { gap: spacing.sm, marginTop: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '600' },
  input: { borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: typography.sizes.lg },
  errorContainer: { backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: borderRadius.sm, padding: spacing.md },
  errorText: { fontSize: typography.sizes.sm, textAlign: 'center' },
  primaryButton: { borderRadius: borderRadius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: spacing.sm, ...shadows.card },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  successTitle: { fontSize: 24, fontWeight: '800', marginTop: spacing.md },
  successBody: { fontSize: typography.sizes.md, textAlign: 'center', lineHeight: 22 },
  secondaryButton: { paddingVertical: spacing.md },
  secondaryButtonText: { fontSize: typography.sizes.md, fontWeight: '600' },
});
