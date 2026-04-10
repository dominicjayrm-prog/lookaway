import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, consumeUsernameSuggestion } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { log } from '@/src/lib/logger';

const USERNAME_REGEX = /^[a-z0-9_]{3,16}$/;

/** Avatar colour randomly picked at account creation. Kept in the
 *  same order as the shop's future colour catalogue so the later
 *  "change colour" screen can treat index as a selection id. */
const AVATAR_COLORS = ['#6C5CE7', '#0984E3', '#00B894', '#FF6B6B', '#F9A825', '#E17055', '#1A1A18', '#A29BFE'] as const;

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/**
 * Makes Blink's pupils glance around the screen — center, right, left,
 * up, down, then back. Discrete keyframes (no per-frame tweening) so
 * the character reads as curious glancing rather than smooth tracking,
 * which is both cuter and cheaper than driving RN Animated values.
 *
 * Each entry: [x, y, holdMs]. x/y are in [-1, 1] where 0,0 = center.
 */
function useLookAround(): { x: number; y: number } {
  const [look, setLook] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const KEYFRAMES: Array<readonly [number, number, number]> = [
      [0, 0, 900],
      [0.7, 0, 800],
      [0, 0, 350],
      [-0.7, 0, 800],
      [0, 0, 350],
      [0, -0.5, 700],
      [0, 0, 300],
      [0, 0.5, 700],
    ];

    let cancelled = false;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const step = () => {
      if (cancelled) return;
      const frame = KEYFRAMES[index % KEYFRAMES.length]!;
      setLook({ x: frame[0], y: frame[1] });
      index += 1;
      timer = setTimeout(step, frame[2]);
    };
    step();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return look;
}

function UsernameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const lookOffset = useLookAround();

  // Grab Apple's suggested slug once on mount. consumeUsernameSuggestion
  // also clears the stash so a later sign-in on the same device doesn't
  // get the previous user's suggestion.
  const [username, setUsername] = useState<string>(() => consumeUsernameSuggestion() ?? '');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sanitize = (text: string) => text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);

  const checkAvailability = useCallback(async (name: string) => {
    if (!USERNAME_REGEX.test(name)) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', name)
      .neq('id', user?.id ?? '')
      .limit(1);
    setAvailability(data && data.length > 0 ? 'taken' : 'available');
  }, [user?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (username.length === 0) { setAvailability('idle'); return; }
    if (!USERNAME_REGEX.test(username)) { setAvailability('invalid'); return; }
    setAvailability('checking');
    debounceRef.current = setTimeout(() => checkAvailability(username), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, checkAvailability]);

  // If the stashed suggestion was non-empty, kick off an availability
  // check immediately so the user can tap Continue without typing.
  useEffect(() => {
    if (username && USERNAME_REGEX.test(username)) {
      void checkAvailability(username);
    }
    // Intentionally only runs once on mount — subsequent availability
    // checks are driven by the change handler above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!user || availability !== 'available' || saving) return;
    setSaving(true);
    // Random avatar colour on first save — user can change later from
    // their profile screen. Keeps this picker singularly focused on
    // the one thing it's here for: picking a username.
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, avatar_color: avatarColor }, { onConflict: 'id' });
    setSaving(false);
    if (error) {
      log.error('auth', 'username save failed', error, { userId: user.id });
      return;
    }
    router.replace('/(tabs)');
  };

  const canContinue = availability === 'available' && !saving;

  const hintColor =
    availability === 'available' ? colors.correct :
    availability === 'taken' || availability === 'invalid' ? colors.wrong :
    colors.textMid;

  const hintText =
    availability === 'idle' ? '3-16 characters \u00B7 letters, numbers, underscores' :
    availability === 'checking' ? 'Checking availability\u2026' :
    availability === 'available' ? '\u2713 Available' :
    availability === 'taken' ? 'Already taken' :
    '3-16 lowercase letters, numbers, or underscores';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.container}>
          {/* ── Hero mascot ── Celebrate Blink with pupils glancing
              around the screen. The curious glance reads as "looking
              at you for an answer" which is exactly the vibe we want
              while the user is picking their identity. */}
          <View style={styles.heroWrap}>
            <AnimatedBlink
              expression="celebrate"
              size={140}
              entrance="spring"
              entranceDelay={100}
              lookOffset={lookOffset}
            />
          </View>

          {/* ── Copy ── Celebratory but grounded. The subtitle is the
              only place we explain *why* the username matters — users
              who've just come through the Apple sheet are on fumes
              attention-wise, one line is plenty. */}
          <Text style={[styles.title, { color: colors.text }]}>You&apos;re in!</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>
            Pick a username so friends can add you.
          </Text>

          {/* ── Username input ── Large, centred, big tap target. The
              @ prefix is non-selectable so the user only edits the
              part that matters. */}
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: availability === 'available' ? colors.correct : availability === 'taken' || availability === 'invalid' ? colors.wrong : colors.border }]}>
            <Text style={[styles.atSign, { color: colors.textMid }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={username}
              onChangeText={(t) => setUsername(sanitize(t))}
              placeholder="username"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={16}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              accessibilityLabel="Username"
            />
            {availability === 'checking' && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          <Text style={[styles.hint, { color: hintColor }]}>{hintText}</Text>

          <View style={styles.spacer} />

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={[styles.button, { backgroundColor: canContinue ? colors.accent : colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Continue with this username"
            accessibilityState={{ disabled: !canContinue, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.buttonText, { color: canContinue ? '#FFF' : colors.textLight }]}>
                Continue
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default UsernameScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  heroWrap: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: typography.weights.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  atSign: {
    fontSize: 22,
    fontWeight: typography.weights.semibold,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: typography.weights.semibold,
    paddingVertical: 0,
  },
  hint: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    marginTop: spacing.md,
    marginLeft: spacing.sm,
  },
  spacer: { flex: 1 },
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
});
