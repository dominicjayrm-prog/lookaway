import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LookAwayLogo } from '@/src/components/LookAwayLogo';
import { Wordmark } from '@/src/components/Wordmark';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email.trim(), password);
        if (result.error) setError(result.error);
      } else {
        const result = await signUp(email.trim(), password, displayName.trim() || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          setSignUpSuccess(true);
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      setError(message);
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSignUpSuccess(false);
  };

  if (signUpSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <LookAwayLogo size={64} />
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We sent a confirmation link to {email}. Tap the link to activate
            your account, then come back and sign in.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => {
              setMode('login');
              setSignUpSuccess(false);
              setPassword('');
            }}
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <LookAwayLogo size={64} />
            <View style={styles.wordmarkWrap}>
              <Wordmark size={28} />
            </View>
            <Text style={styles.tagline}>Memorise. Look away. Answer.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Sign in to continue your journey'
                : 'Start training your memory today'}
            </Text>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Display name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What should we call you?"
                  placeholderTextColor={colors.textLight}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
              <Text style={styles.toggleLink}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxxl },
  wordmarkWrap: { marginTop: spacing.md },
  tagline: { fontSize: 14, color: colors.textMid, marginTop: spacing.sm },
  formCard: { backgroundColor: colors.card, borderRadius: 20, padding: spacing.xxl, ...shadows.card },
  formTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  formSubtitle: { fontSize: typography.sizes.md, color: colors.textMid, marginBottom: spacing.xxl },
  inputContainer: { marginBottom: spacing.lg },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: typography.sizes.lg, color: colors.text, borderWidth: 1, borderColor: 'transparent' },
  errorContainer: { backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { fontSize: typography.sizes.sm, color: colors.wrong, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: 16, paddingHorizontal: spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 52, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxl, paddingBottom: spacing.xxxl },
  toggleText: { fontSize: typography.sizes.md, color: colors.textMid },
  toggleLink: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.accent },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  successBody: { fontSize: typography.sizes.md, color: colors.textMid, textAlign: 'center', lineHeight: 22 },
});
