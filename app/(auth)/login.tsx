import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Wordmark } from '@/src/components/Wordmark';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

type Mode = 'login' | 'signup';

function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  // Redirect to home when session is established (after sign in/up)
  useEffect(() => {
    if (session) router.replace('/');
  }, [session]);
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced username availability check
  const handleUsernameChange = (text: string) => {
    const sanitized = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
    setUsernameInput(sanitized);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (sanitized.length < 3) { setUsernameStatus(sanitized.length > 0 ? 'invalid' : 'idle'); return; }
    if (!/^[a-z0-9_]+$/.test(sanitized)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('username').eq('username', sanitized).single();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 300);
  };

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

    if (mode === 'signup' && usernameStatus !== 'available') {
      setError('Please choose an available username');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setError(result.error);
        } else {
          // Explicitly redirect — don't rely solely on session useEffect
          router.replace('/');
        }
      } else {
        const result = await signUp(email.trim(), password, username.trim() || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          // With email confirmation OFF, user is already signed in.
          // Save username to profiles.
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.user?.id && username.trim()) {
            await supabase.from('profiles').upsert({
              id: session.session.user.id,
              username: username.trim(),
              display_name: username.trim(),
            }, { onConflict: 'id' });
          }
          // Explicitly redirect after signup
          router.replace('/');
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <BlankedLogo size={64} />
          <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.successBody, { color: colors.textMid }]}>
            We sent a confirmation link to {email}. Tap the link to activate
            your account, then come back and sign in.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setMode('login');
              setSignUpSuccess(false);
              setPassword('');
            }}
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <AnimatedBlink expression="normal" size={80} entrance="spring" entranceDelay={200} />
            <View style={styles.wordmarkWrap}>
              <Wordmark size={28} />
            </View>
            <Text style={[styles.tagline, { color: colors.textMid }]}>Don't blank.</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textMid }]}>
              {mode === 'login'
                ? 'Sign in to continue your journey'
                : 'Start training your memory today'}
            </Text>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
                <View style={[styles.usernameRow, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.atPrefix, { color: colors.textMid }]}>@</Text>
                  <TextInput
                    style={[styles.usernameInput, { color: colors.text }]}
                    placeholder="choose_a_username"
                    placeholderTextColor={colors.textLight}
                    value={username}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {usernameStatus === 'available' && <Text style={styles.usernameAvailable}>Available</Text>}
                {usernameStatus === 'taken' && <Text style={styles.usernameTaken}>Already taken</Text>}
                {usernameStatus === 'invalid' && <Text style={[styles.usernameHint, { color: colors.textLight }]}>3-16 chars, lowercase letters, numbers, underscores</Text>}
                {usernameStatus === 'checking' && <Text style={[styles.usernameHint, { color: colors.textLight }]}>Checking...</Text>}
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
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
              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: focusedField === 'password' ? colors.accent : 'transparent' }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                returnKeyType="done"
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
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: colors.textMid }]}>
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </Text>
            <Pressable onPress={toggleMode} style={{ padding: 4 }}>
              <Text style={[styles.toggleLink, { color: colors.accent }]}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AuthScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxxl },
  wordmarkWrap: { marginTop: spacing.md },
  tagline: { fontSize: 14, marginTop: spacing.sm },
  formCard: { borderRadius: 20, padding: spacing.xxl, ...shadows.card },
  formTitle: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  formSubtitle: { fontSize: typography.sizes.md, marginBottom: spacing.xxl },
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
  primaryButton: { borderRadius: borderRadius.md, paddingVertical: 16, paddingHorizontal: spacing.xxl, alignItems: 'center' as const, justifyContent: 'center' as const, minHeight: 52, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxl, paddingBottom: spacing.xxxl },
  toggleText: { fontSize: typography.sizes.md },
  toggleLink: { fontSize: typography.sizes.md, fontWeight: '700' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg },
  successTitle: { fontSize: 22, fontWeight: '700', marginTop: spacing.md },
  successBody: { fontSize: typography.sizes.md, textAlign: 'center', lineHeight: 22 },
});
