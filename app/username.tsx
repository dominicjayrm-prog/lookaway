import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

const USERNAME_REGEX = /^[a-z0-9_]{3,16}$/;
const AVATAR_COLORS = ['#6C5CE7', '#0984E3', '#00B894', '#FF6B6B', '#F9A825', '#E17055', '#1A1A18', '#A29BFE'];

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function UsernameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
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

  const handleContinue = async () => {
    if (!user || availability !== 'available') return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, avatar_color: avatarColor }, { onConflict: 'id' });
    setSaving(false);
    if (!error) router.replace('/(tabs)');
  };

  const canContinue = availability === 'available' && !saving;

  const hintColor =
    availability === 'available' ? colors.correct :
    availability === 'taken' || availability === 'invalid' ? colors.wrong :
    colors.textMid;

  const hintText =
    availability === 'idle' ? '3-16 characters, letters, numbers, underscores' :
    availability === 'checking' ? 'Checking availability...' :
    availability === 'available' ? 'Available' :
    availability === 'taken' ? 'Already taken' :
    'Must be 3-16 lowercase letters, numbers, or underscores';

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Choose your username</Text>
        <Text style={s.subtitle}>This is how friends will find you.</Text>

        <View style={s.inputRow}>
          <Text style={s.atSign}>@</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={(t) => setUsername(sanitize(t))}
            placeholder="username"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={16}
          />
          {availability === 'checking' && <ActivityIndicator size="small" color={colors.accent} />}
        </View>

        <Text style={[s.hint, { color: hintColor }]}>{hintText}</Text>

        <Text style={s.sectionLabel}>Pick a colour</Text>
        <View style={s.colorRow}>
          {AVATAR_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setAvatarColor(c)} style={s.colorWrapper}>
              <View
                style={[
                  s.colorCircle,
                  { backgroundColor: c },
                  avatarColor === c && { borderColor: colors.text, borderWidth: 3 },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={s.spacer} />

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={[s.button, { backgroundColor: canContinue ? colors.accent : colors.surface }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[s.buttonText, { color: canContinue ? '#FFF' : colors.textLight }]}>
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default UsernameScreen;

const styles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
    title: { fontSize: 24, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm },
    subtitle: { fontSize: 14, color: colors.textMid, marginBottom: spacing.xxxl },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      height: 52,
    },
    atSign: { fontSize: 18, fontWeight: typography.weights.semibold, color: colors.textMid, marginRight: spacing.xs },
    input: { flex: 1, fontSize: 18, color: colors.text, paddingVertical: 0 },
    hint: { fontSize: 12, marginTop: spacing.sm, marginLeft: spacing.xs },
    sectionLabel: { fontSize: 14, fontWeight: typography.weights.semibold, color: colors.text, marginTop: spacing.xxxl, marginBottom: spacing.md },
    colorRow: { flexDirection: 'row', justifyContent: 'space-between' },
    colorWrapper: { padding: 2 },
    colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 0, borderColor: 'transparent' },
    spacer: { flex: 1 },
    button: {
      height: 52,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    buttonText: { fontSize: 16, fontWeight: typography.weights.semibold },
  });
