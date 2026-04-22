/**
 * Reset password screen — terminal step of the password reset flow.
 *
 * The user lands here via the deep link in the password reset email.
 * By this point Supabase has already exchanged the token for a
 * recovery session (onAuthStateChange fired 'PASSWORD_RECOVERY' in
 * AuthProvider), and `supabase.auth.getSession()` returns a valid
 * session but the user hasn't set their new password yet.
 *
 * We:
 *  1. Confirm a session is active — if not, bounce back to
 *     forgot-password with a friendly message
 *  2. Show a new-password + confirm-password form
 *  3. On submit, call supabase.auth.updateUser({ password })
 *  4. On success, sign them out of the recovery session (so they
 *     have to log in fresh with their new password) and route
 *     them to the login screen
 */
import React, { useEffect, useState } from 'react';
import { t } from '@/src/i18n';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session, clearPasswordRecovery } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  // Suggested email pulled from the recovery session — lets us show
  // "You're updating the password for you@example.com" which reduces
  // confusion when someone has multiple accounts.
  const email = session?.user?.email ?? '';

  // Defensive: if someone reaches this route without a recovery
  // session (e.g. opened the URL from another device / long after
  // the token expired), kick them back to forgot-password with a
  // clear message instead of letting them mash Submit.
  useEffect(() => {
    if (session) return;
    // Give the auth listener a beat to hydrate — the recovery
    // session might not be established until after DeepLinkHandler
    // processes the inbound URL.
    const timeoutId = setTimeout(() => {
      if (!session) router.replace('/(auth)/forgot-password');
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [session, router]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\u2019t match');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message || 'Could not update password. Please try again.');
      return;
    }
    setDone(true);
    // Clear the recovery flag FIRST so that when signOut fires below
    // (which itself clears it too, belt-and-braces), any transient
    // re-render while navigating doesn't briefly re-route the user
    // back to this screen.
    clearPasswordRecovery();
    // Sign out of the recovery session so the user has to log in
    // fresh with the new password — confirms they know it and
    // keeps other-device sessions invalidated.
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    }, 1200);
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.correctSoft }]}>
            <Ionicons name="checkmark" size={40} color={colors.correct} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.password_updated')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>Signing you back in…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={{ alignSelf: 'center' }}>
            <AnimatedBlink expression="thinking" size={96} entrance="spring" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.set_new_password')}</Text>
          {email ? (
            <Text style={[styles.subtitle, { color: colors.textMid }]}>for {email}</Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.textMid }]}>
              Pick something at least 6 characters long.
            </Text>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.new_password')}</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete="new-password"
                autoFocus
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMid} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.confirm_password')}</Text>
            {/* The shared `input` style is `flex: 1, paddingVertical: 0`
                because it was designed to sit inside an `inputWrap`
                container (see the new-password field above). Applying
                it standalone collapses the field to zero height, which
                is why this box was invisible and untappable. Wrap it
                in an `inputWrap` the same way so the confirm input
                matches the new-password input exactly. */}
            <View style={[styles.inputWrap, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Type it again"
                placeholderTextColor={colors.textLight}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
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
            accessibilityLabel="Update password"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('auth.update_password')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.md },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', marginTop: spacing.md },
  subtitle: { fontSize: typography.sizes.md },
  inputContainer: { gap: spacing.sm, marginTop: spacing.sm },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '600' },
  input: { flex: 1, fontSize: typography.sizes.lg, paddingVertical: 0 },
  inputWrap: { borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorContainer: { backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: borderRadius.sm, padding: spacing.md, marginTop: spacing.sm },
  errorText: { fontSize: typography.sizes.sm, textAlign: 'center' },
  primaryButton: { borderRadius: borderRadius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: spacing.md, ...shadows.card },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  successIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
});
