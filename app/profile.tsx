import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Image, Alert, Platform, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { loadAllAchievements, loadPlayerProgress, countUnlockedTiers, type Achievement, type PlayerAchievement } from '@/src/utils/achievements';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { ProfileBanner } from '@/src/components/ProfileBanner';
import { getFrameById, getBannerById, getNameColorById, getExpressionById, getAvailableFrames, getAvailableBanners, getAvailableExpressions, RARITY_COLORS } from '@/src/data/cosmetics';
import { Blink } from '@/src/components/Blink';
import type { BlinkExpression } from '@/src/components/Blink';
import { uploadAvatar, removeAvatar } from '@/src/utils/avatarUpload';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CosmeticPicker } from '@/src/components/CosmeticPicker';
import { PowerUpViewer } from '@/src/components/PowerUpViewer';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { t } from '@/src/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';
// Local cache key — stopgap between "user picked a photo" and
// "cloud upload finished + setAvatarUrl has landed in the store".
// SCOPED PER USER (`blanked-profile-pic::<userId>`) so switching
// accounts doesn't leak one user's cached photo into another's
// UI. Previously a single global key was used and accounts on the
// same device shared the cache — a test account would see the
// main account's selfie top-right until the cloud URL hydrated,
// which is exactly the bug you saw.
const PROFILE_PIC_KEY_PREFIX = 'blanked-profile-pic::';
function profilePicKey(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${PROFILE_PIC_KEY_PREFIX}${userId}`;
}
function loadProfilePicSync(userId: string | null | undefined): string | null {
  const key = profilePicKey(userId);
  if (!key) return null;
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch { return null; }
}
function saveProfilePic(userId: string | null | undefined, uri: string | null) {
  const key = profilePicKey(userId);
  if (!key) return;
  try {
    if (typeof localStorage !== 'undefined') {
      if (uri) localStorage.setItem(key, uri);
      else localStorage.removeItem(key);
    }
  } catch {}
  if (Platform.OS !== 'web') {
    if (uri) AsyncStorage.setItem(key, uri).catch(() => {});
    else AsyncStorage.removeItem(key).catch(() => {});
  }
}
/**
 * Migrate the legacy global cache key the first time we see a
 * logged-in user. Any value there belongs to "whoever used this
 * device last" and must not follow a fresh account — so we
 * unconditionally DELETE it rather than copying it to the new
 * scoped key. This is how we stop the cross-account leak for
 * existing installs (new installs won't have the old key at all).
 */
function purgeLegacyProfilePicCache() {
  const LEGACY_KEY = 'blanked-profile-pic';
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_KEY); } catch {}
  if (Platform.OS !== 'web') AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
}

function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, isDark, isManual, toggleTheme, resetToSystem } = useTheme();
  const { totalStars, streakCount, getCompletedLevelCount, getMemoryScore, equippedFrame, equippedBanner, equippedNameColor, ownedCosmetics, equippedExpression: eqExpr, equipCosmetic, isSubscribed, username: storeUsername, avatarUrl: storeAvatarUrl, setAvatarUrl } = useGameStore();
  const hasBlankedPlus = isSubscribed();
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();
  const email = user?.email || t('common.player');
  // Header handle: prefer the game store's username (hydrates from
  // cloud on sign-in). If for any reason the store hasn't caught up
  // yet — e.g. Apple sign-in where the username was set on another
  // render tick — fetch directly from `profiles.username` and cache
  // locally. We deliberately DO NOT fall back to
  // `user.email.split('@')[0]` because Apple Private Relay produces
  // opaque hashes like `94my4rngp5@privaterelay.appleid.com` that
  // make no sense as a visible @-handle.
  const [fetchedUsername, setFetchedUsername] = useState<string | null>(null);
  useEffect(() => {
    if (storeUsername || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (!cancelled && data?.username) setFetchedUsername(data.username);
    })();
    return () => { cancelled = true; };
  }, [storeUsername, user?.id]);
  const headerName = storeUsername ?? fetchedUsername ?? t('common.player');
  const initials = headerName.slice(0, 2).toUpperCase();
  // Profile pic priority: server avatar_url (works across devices) →
  // locally cached data URI (works offline / during upload). The
  // local cache is scoped per user id — see PROFILE_PIC_KEY_PREFIX
  // and its comment for why.
  const [profilePic, setProfilePic] = useState<string | null>(() => storeAvatarUrl ?? loadProfilePicSync(user?.id));
  // On every mount: (1) unconditionally purge the legacy global key
  // that predates per-user scoping, and (2) on native where
  // localStorage doesn't exist, hydrate the cached pic from
  // AsyncStorage under the scoped key.
  useEffect(() => {
    purgeLegacyProfilePicCache();
    if (Platform.OS === 'web') return;
    if (storeAvatarUrl) return;
    const key = profilePicKey(user?.id);
    if (!key) return;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((cached) => {
        if (!cancelled && cached && !profilePic) setProfilePic(cached);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  // Keep the local pic in sync with the store's avatarUrl whenever
  // cloud sync refreshes it — covers the "fresh Safari / iPhone" case
  // where localStorage is empty but the user already has a photo
  // uploaded on another device.
  useEffect(() => {
    if (storeAvatarUrl && storeAvatarUrl !== profilePic) setProfilePic(storeAvatarUrl);
  }, [storeAvatarUrl, profilePic]);
  const frame = getFrameById(equippedFrame);
  const banner = getBannerById(equippedBanner);
  const nameColor = getNameColorById(equippedNameColor);
  const nameStyle = nameColor && nameColor.color !== 'theme' ? { color: nameColor.color } : { color: colors.text };
  const eqExprCosmetic = getExpressionById(eqExpr);
  const eqFrame = equippedFrame;
  const profileBlink: BlinkExpression = eqExprCosmetic ? eqExprCosmetic.blinkExpression : 'normal';

  // Division badge
  const divisionThresholds = [
    { name: t('profile.divisions.master'), emoji: '👑', color: '#D4A012', min: 800, next: null },
    { name: t('profile.divisions.diamond'), emoji: '⭐', color: '#74B9FF', min: 500, next: 800 },
    { name: t('profile.divisions.platinum'), emoji: '💎', color: '#A29BFE', min: 300, next: 500 },
    { name: t('profile.divisions.gold'), emoji: '🥇', color: '#D4A012', min: 150, next: 300 },
    { name: t('profile.divisions.silver'), emoji: '🥈', color: '#B2BEC3', min: 50, next: 150 },
    { name: t('profile.divisions.bronze'), emoji: '🥉', color: '#CD7F32', min: 0, next: 50 },
  ];
  const division = divisionThresholds.find(d => totalStars >= d.min) ?? divisionThresholds[5];
  const toNext = division.next ? division.next - totalStars : 0;

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerProgress, setPlayerProgress] = useState<Record<string, PlayerAchievement>>({});

  useEffect(() => { loadAllAchievements().then(setAchievements); if (user?.id) loadPlayerProgress(user.id).then(setPlayerProgress); }, [user?.id]);

  const unlockedCount = countUnlockedTiers(playerProgress);
  const totalTiers = achievements.length * 3;

  const [showFramePicker, setShowFramePicker] = useState(false);
  const [showExprPicker, setShowExprPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [showPowerUpViewer, setShowPowerUpViewer] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const preferredLanguage = useGameStore((s) => s.preferredLanguage);
  // Show the user what locale they're effectively on. 'system' stays
  // labelled "Automatic" because they haven't pinned a choice — the
  // picker sheet shows the same label on its first option.
  const languageRowValue =
    preferredLanguage === 'en' ? 'English' :
    preferredLanguage === 'es' ? 'Español' :
    t('settings.preferences.language.option_system');

  const frameData = getAvailableFrames(ownedCosmetics);
  const bannerData = getAvailableBanners(ownedCosmetics);
  const exprData = getAvailableExpressions(ownedCosmetics);

  const handlePickPhoto = useCallback(async () => {
    setShowPhotoOptions(false);
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const uri = reader.result as string;
          setProfilePic(uri);
          saveProfilePic(user?.id, uri);
          if (user?.id) {
            uploadAvatar(user.id, uri)
              .then((result) => {
                if (result.ok && result.publicUrl) {
                  // Push the cloud URL into the store so every surface
                  // that reads avatarUrl (home greeting, friends list
                  // lookup fallbacks, etc.) updates without waiting
                  // for the next loadFromCloud.
                  setAvatarUrl(result.publicUrl);
                  setProfilePic(result.publicUrl);
                } else {
                  Alert.alert(t('profile.photo.upload_failed_title'), result.error ?? t('profile.photo.upload_failed_body'));
                }
              })
              .catch((e) => Alert.alert(t('profile.photo.upload_failed_title'), e?.message ?? t('profile.photo.upload_failed_body')));
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('profile.photo.permission_title'), t('profile.photo.permission_body')); return; }
      // base64: true so we get the raw bytes back alongside the file:// URI.
      // The previous path passed a naked file:// URI to uploadAvatar, which
      // parses it as a data: URI, fails the regex, and silently returned
      // null — so avatar_url never landed in Supabase and the photo
      // disappeared the moment we left the profile screen.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Reconstruct a data: URI the upload helper understands. JPEG
        // works for both camera photos and gallery picks with quality:
        // 0.8; explicit PNG detection via the file extension handles
        // screenshots / transparent images.
        const mime = asset.uri?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUri = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri;
        // Show the local file immediately — upload runs in the
        // background and swaps to the cloud URL once complete.
        setProfilePic(asset.uri);
        saveProfilePic(user?.id, asset.uri);
        if (user?.id) {
          uploadAvatar(user.id, dataUri)
            .then((result) => {
              if (result.ok && result.publicUrl) {
                setAvatarUrl(result.publicUrl);
                setProfilePic(result.publicUrl);
                // Overwrite the cached URI with the cloud URL so
                // the next cold start on this device reads the
                // permanent URL, not the ephemeral file:// path.
                saveProfilePic(user.id, result.publicUrl);
              } else {
                Alert.alert('Upload failed', result.error ?? "We couldn't sync your photo to the cloud. Please try again.");
              }
            })
            .catch((e) => Alert.alert('Upload failed', e?.message ?? "We couldn't sync your photo to the cloud. Please try again."));
        }
      }
    }
  }, [user?.id, setAvatarUrl]);
  const handleSignOut = useCallback(async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); try { await signOut(); setTimeout(() => router.replace('/(auth)/login'), 200); } catch { router.replace('/(auth)/login'); } }, [signOut, router]);

  // Delete account — Apple guideline 5.1.1(v) requires in-app account deletion.
  // Two confirmation dialogs because this is irreversible.
  /** Actually performs the delete — extracted so both the native Alert.alert
   *  chain AND the web window.confirm path can reuse it. Deletes every
   *  row keyed off user_id across our tables, clears local storage,
   *  signs out, then routes to login. */
  const performAccountDeletion = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    try {
      // Friend-side tables come first because their FKs reference
      // profiles — if profiles is deleted first with CASCADE it's fine,
      // but without cascade some rows would orphan. This order works
      // regardless of cascade configuration.
      await supabase.from('user_progress').delete().eq('user_id', userId);
      await supabase.from('friend_challenges').delete().or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);
      await supabase.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      await supabase.from('economy_events').delete().eq('user_id', userId);
      await supabase.from('daily_results').delete().eq('user_id', userId);
      await supabase.from('streak_rewards').delete().eq('user_id', userId);
      // Profile last — streak_rewards CASCADE would handle it but explicit
      // is safer if RLS on the cascade side ever changes.
      await supabase.from('profiles').delete().eq('id', userId);
      try { if (typeof localStorage !== 'undefined') localStorage.clear(); } catch {}
      await supabase.auth.signOut();
      log.breadcrumb('auth', 'account deleted', { userId });
      router.replace('/(auth)/login');
    } catch (e) {
      log.error('profile', 'account deletion failed', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(t('settings.danger.failed_body'));
      } else {
        Alert.alert(t('common.error'), t('settings.danger.failed_body'));
      }
    }
  }, [user?.id, router]);

  const handleDeleteAccount = useCallback(() => {
    // Alert.alert's multi-step chain is unreliable on web (it often no-ops
    // or only fires the first confirm), so fall back to window.confirm
    // there. Native iOS/Android keep the prettier Alert chain.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const first = window.confirm(
        `${t('settings.danger.confirm_title')}\n\n${t('settings.danger.confirm_body')}`,
      );
      if (!first) return;
      const second = window.confirm(
        `${t('settings.danger.final_title')}\n\n${t('settings.danger.final_body')}`,
      );
      if (!second) return;
      performAccountDeletion();
      return;
    }

    Alert.alert(
      t('settings.danger.confirm_title'),
      t('settings.danger.confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.danger.confirm_cta'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.danger.final_title'),
              t('settings.danger.final_body'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('settings.danger.final_cta'), style: 'destructive', onPress: performAccountDeletion },
              ],
            );
          },
        },
      ],
    );
  }, [performAccountDeletion]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Animated.View entering={isWeb ? undefined : FadeIn.duration(300)} style={styles.header}>
        <Pressable
          onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.go_back_aria')}
        ><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile banner + avatar */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(100)}>
          <View style={{ position: 'relative' }}>
            <ProfileBanner banner={banner ?? null} height={120} />
            <Pressable
              onPress={() => setShowBannerPicker(true)}
              style={styles.bannerEditBtn}
              accessibilityRole="button"
              accessibilityLabel={t('profile.change_banner_aria')}
            >
              <Ionicons name="pencil" size={12} color="#FFF" />
            </Pressable>
          </View>
          <View style={[styles.avatarSection, { marginTop: -44, paddingTop: 0 }]}>
            <Pressable
              onPress={() => setShowPhotoOptions(true)}
              style={styles.avatarContainer}
              accessibilityRole="button"
              accessibilityLabel={t('profile.change_photo_aria')}
            >
              <AvatarFrame frame={frame ?? null} size={80}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={[styles.avatar, { backgroundColor: colors.surface }]} />
                ) : (
                  <AnimatedBlink expression={profileBlink} size={80} />
                )}
              </AvatarFrame>
              <View style={[styles.cameraButton, { backgroundColor: colors.card, borderColor: colors.bg }]}>
                <Ionicons name="camera" size={14} color={colors.accent} />
              </View>
            </Pressable>
            <Text style={[styles.displayName, nameStyle]}>@{headerName}</Text>
            {/* Division badge */}
            <View style={[styles.divisionBadge, { backgroundColor: division.color + '18', borderColor: division.color + '30', shadowColor: division.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 }]}>
              <Text style={{ fontSize: 12 }}>{division.emoji}</Text>
              <Text style={[styles.divisionText, { color: division.color }]}>{division.name}{toNext > 0 ? ` - ${t('profile.division_to_next', { count: toNext })}` : ''}</Text>
            </View>
            <Text style={[styles.email, { color: colors.textMid }]}>{email}</Text>

            {/* Customisation pill buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => setShowFramePicker(true)}
                style={[styles.customPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.change_frame_aria')}
              >
                <Ionicons name="ellipse-outline" size={14} color={colors.accent} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{t('profile.frame_label')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowExprPicker(true)}
                style={[styles.customPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.change_expression_aria')}
              >
                <Ionicons name="happy-outline" size={14} color={colors.accent} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{t('profile.expression_label')}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(200)}>
          <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.accent }]}>{completedCount > 0 ? `${memoryScore}%` : '--'}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>{t('profile.stats.memory')}</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.gold }]}>{totalStars}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>{t('profile.stats.stars')}</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.wrong }]}>{streakCount}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>{t('profile.stats.streak')}</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.correct }]}>{completedCount}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>{t('profile.stats.levels')}</Text></View>
          </View>
        </Animated.View>

        {/* Achievements card */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(250)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push('/achievements')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.cards.achievements_aria')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.goldSoft }]}>
                  <Ionicons name="medal" size={18} color={colors.gold} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.cards.achievements')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>{t('profile.cards.achievements_progress', { unlocked: unlockedCount, total: totalTiers })}</Text>
                </View>
              </View>
              <View style={styles.settingsRowRight}>
                <View style={[styles.achCountBadge, { backgroundColor: unlockedCount > 0 ? colors.goldSoft : colors.surface }]}>
                  <Text style={[styles.achCountText, { color: unlockedCount > 0 ? colors.gold : colors.textLight }]}>{unlockedCount}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Memory Analytics card — Blanked+ feature */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(260)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push('/stats-space')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.cards.analytics_aria')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="analytics" size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.cards.analytics')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>{t('profile.cards.analytics_help')}</Text>
                </View>
              </View>
              <View style={styles.settingsRowRight}>
                {!hasBlankedPlus && (
                  <View style={[styles.achCountBadge, { backgroundColor: colors.accentSoft }]}>
                    <Text style={[styles.achCountText, { color: colors.accent, letterSpacing: 0.6 }]}>BLANKED+</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Power-ups / Boosts card */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(250)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => setShowPowerUpViewer(true)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.cards.power_ups_aria')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="flash" size={18} color={colors.blue} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.cards.power_ups')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    {(() => {
                      const p = useGameStore.getState().powerUps;
                      const total = (p.slowTime ?? 0) + (p.peek ?? 0) + (p.fiftyFifty ?? 0) + (p.skip ?? 0) + (p.extra_life ?? 0);
                      if (total === 0) return t('profile.cards.power_ups_none');
                      return total === 1
                        ? t('profile.cards.power_ups_one', { count: total })
                        : t('profile.cards.power_ups_many', { count: total });
                    })()}
                  </Text>
                </View>
              </View>
              <View style={styles.settingsRowRight}>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>{t('profile.sections.appearance')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(124,108,247,0.12)' : colors.accentSoft }]}><Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} /></View><View><Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.appearance.dark_mode')}</Text><Text style={{ fontSize: 10, color: colors.textLight, marginTop: 1 }}>{isManual ? t('profile.appearance.manual') : t('profile.appearance.following_system')}</Text></View></View>
              <Switch value={isDark} onValueChange={(v) => { Haptics.selectionAsync().catch(() => {}); toggleTheme(); }} trackColor={{ true: colors.accent, false: colors.surface }} thumbColor="#FFFFFF" />
            </View>
            {isManual && (<><View style={[styles.divider, { backgroundColor: colors.border }]} /><Pressable style={styles.settingsRow} onPress={resetToSystem} accessibilityRole="button" accessibilityLabel={t('profile.appearance.reset_aria')}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.surface }]}><Ionicons name="sync" size={16} color={colors.textMid} /></View><Text style={[styles.settingsLabel, { color: colors.textMid, fontSize: 13 }]}>{t('profile.appearance.reset_label')}</Text></View></Pressable></>)}
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>{t('profile.sections.settings')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <SettingsRow icon="volume-high" label={t('profile.settings_rows.sound')} colors={colors} storageKey="sound" />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="phone-portrait" label={t('profile.settings_rows.haptics')} colors={colors} storageKey="haptics" />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="notifications" label={t('profile.settings_rows.notifications')} colors={colors} storageKey="notifications" />
          </View>
        </Animated.View>

        {/* Game Stats card */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(500)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="bar-chart" size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.cards.game_stats')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    {(() => {
                      const lp = useGameStore.getState().levelProgress;
                      const entries = Object.values(lp);
                      const perfectLevels = entries.filter(e => e.stars === 3).length;
                      const totalAttempts = entries.reduce((sum, e) => sum + (e.attempts ?? 0), 0);
                      const bestScore = entries.length > 0 ? Math.max(...entries.map(e => e.bestScore ?? 0)) : 0;
                      return t('profile.cards.game_stats_detail', { best: bestScore, perfect: perfectLevels, attempts: totalAttempts });
                    })()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Cosmetics Inventory */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(550)}>
          <Pressable
            onPress={() => router.push('/(tabs)/shop')}
            style={[styles.settingsCard, { backgroundColor: colors.card }]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.cards.cosmetics_aria')}
          >
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.goldSoft }]}>
                  <Ionicons name="sparkles" size={18} color={colors.gold} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.cards.cosmetics')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    {t('profile.cards.cosmetics_count', { count: ownedCosmetics.length })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(575)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>{t('profile.sections.language')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setShowLanguagePicker(true); }}
              accessibilityRole="button"
              accessibilityLabel={t('settings.preferences.language.title')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="globe-outline" size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('settings.preferences.language.title')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>{languageRowValue}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(600)}>
          {/* Legal — privacy + terms open as in-app WebView screens */}
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>{t('profile.sections.legal')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => { if (!isWeb) { try { require('expo-haptics').selectionAsync(); } catch {} } router.push('/privacy'); }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.legal.privacy')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.legal.privacy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
            <Pressable
              style={styles.settingsRow}
              onPress={() => { if (!isWeb) { try { require('expo-haptics').selectionAsync(); } catch {} } router.push('/terms'); }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.legal.terms')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.legal.terms')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMid, marginTop: spacing.xl }]}>{t('profile.sections.account')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => { if (!isWeb) { try { require('expo-haptics').selectionAsync(); } catch {} } router.push('/blocked-users'); }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.account.blocked')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}>
                  <Ionicons name="ban-outline" size={18} color={colors.wrong} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>{t('profile.account.blocked')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
            <Pressable style={styles.settingsRow} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel={t('profile.account.sign_out')}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}><Ionicons name="log-out" size={18} color={colors.wrong} /></View><Text style={[styles.settingsLabel, { color: colors.wrong }]}>{t('profile.account.sign_out')}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textLight} /></Pressable>
          </View>

          {/* Danger zone — Delete account (Apple guideline 5.1.1(v)) */}
          <Text style={[styles.sectionTitle, { color: colors.textMid, marginTop: spacing.xl }]}>{t('settings.danger.section')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.wrong + '20', borderWidth: 1 }]}>
            <Pressable style={styles.settingsRow} onPress={handleDeleteAccount} accessibilityRole="button" accessibilityLabel={t('settings.danger.delete_account_aria')}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}>
                  <Ionicons name="trash-outline" size={18} color={colors.wrong} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.wrong }]}>{t('settings.danger.delete_account')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.wrong + '60'} />
            </Pressable>
          </View>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textLight }]}>{t('profile.version_footer')}</Text>
      </ScrollView>

      {/* Photo Options Modal (simple) */}
      <Modal visible={showPhotoOptions} transparent animationType="fade" onRequestClose={() => setShowPhotoOptions(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setShowPhotoOptions(false)}
          accessibilityRole="button"
          accessibilityLabel={t('profile.photo.dismiss_aria')}
        >
          <View style={[styles.photoSheet, { backgroundColor: colors.card, maxWidth: Platform.OS === 'web' ? 360 : undefined, width: '85%' }]}>
            <Pressable
              onPress={() => { handlePickPhoto(); setShowPhotoOptions(false); }}
              style={[styles.pickerUploadBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.photo.upload_aria')}
            >
              <Ionicons name="camera" size={18} color={colors.accent} />
              <Text style={[styles.pickerUploadText, { color: colors.text }]}>{t('profile.photo.upload')}</Text>
            </Pressable>
            {profilePic && (
              <Pressable
                onPress={() => { setProfilePic(null); saveProfilePic(user?.id, null); setAvatarUrl(null); setShowPhotoOptions(false); if (user?.id) removeAvatar(user.id).catch(() => {/* cleanup is best-effort */}); }}
                style={[styles.pickerUploadBtn, { backgroundColor: colors.wrongSoft, borderColor: colors.wrong + '30' }]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.photo.remove_aria')}
              >
                <Ionicons name="close-circle" size={18} color={colors.wrong} />
                <Text style={[styles.pickerUploadText, { color: colors.wrong }]}>{t('profile.photo.remove')}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Frame Picker */}
      <CosmeticPicker
        visible={showFramePicker}
        onDismiss={() => setShowFramePicker(false)}
        title={t('profile.change_frame_title')}
        ownedItems={frameData.owned}
        lockedItems={frameData.locked}
        equippedId={eqFrame}
        onEquip={(id) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); equipCosmetic('frame', id); }}
        renderPreview={(item) => (
          <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: 'borderColor' in item ? String(item.borderColor) : colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Blink expression="normal" size={34} />
          </View>
        )}
      />

      {/* Expression Picker */}
      <CosmeticPicker
        visible={showExprPicker}
        onDismiss={() => setShowExprPicker(false)}
        title={t('profile.change_expression_title')}
        ownedItems={exprData.owned}
        lockedItems={exprData.locked}
        equippedId={eqExpr}
        onEquip={(id) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); equipCosmetic('expression', id); }}
        renderPreview={(item) => (
          <View style={{ marginBottom: 4 }}>
            <Blink expression={'blinkExpression' in item ? (String((item as Record<string, unknown>).blinkExpression) as 'normal') : 'normal'} size={40} />
          </View>
        )}
      />

      {/* Banner Picker */}
      <CosmeticPicker
        visible={showBannerPicker}
        onDismiss={() => setShowBannerPicker(false)}
        title={t('profile.change_banner_title')}
        ownedItems={bannerData.owned}
        lockedItems={bannerData.locked}
        equippedId={equippedBanner}
        onEquip={(id) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); equipCosmetic('banner', id); }}
        renderPreview={(item) => (
          <LinearGradient
            colors={'gradientColors' in item ? (item as Record<string, unknown>).gradientColors as [string, string] : ['#6C5CE7', '#A29BFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 60, height: 28, borderRadius: 8 }}
          />
        )}
      />

      {/* Power-up Viewer */}
      <PowerUpViewer visible={showPowerUpViewer} onDismiss={() => setShowPowerUpViewer(false)} />

      {/* Language Picker */}
      <LanguagePicker visible={showLanguagePicker} onDismiss={() => setShowLanguagePicker(false)} />
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, colors, storageKey }: { icon: string; label: string; colors: any; storageKey: string }) {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try { const v = localStorage.getItem(`blanked_setting_${storageKey}`); if (v === 'false') setEnabled(false); } catch {}
  }, [storageKey]);
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(`blanked_setting_${storageKey}`, String(next)); } catch {}
  };
  return (<View style={styles.settingsRow}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={icon as any} size={18} color={colors.accent} /></View><Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text></View><Switch value={enabled} onValueChange={toggle} trackColor={{ true: colors.accent, false: colors.surface }} thumbColor="#FFFFFF" /></View>);
}

export default ProfileScreen;
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { width: 40, height: 40, minWidth: 44, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  headerSpacer: { width: 40 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingBottom: spacing.lg },
  avatarContainer: { position: 'relative' as const, marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  cameraButton: { position: 'absolute' as const, bottom: 0, right: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 2 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  displayName: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  email: { fontSize: typography.sizes.md },
  statsRow: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xxl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, alignSelf: 'stretch' },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm, marginTop: spacing.md, paddingLeft: spacing.xs },
  settingsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingsRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  comingSoon: { fontSize: typography.sizes.xs },
  divider: { height: 1, marginLeft: 62 },
  version: { textAlign: 'center', fontSize: 10, fontWeight: '600', marginTop: spacing.xxl, letterSpacing: 1 },
  achCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, minWidth: 28, alignItems: 'center' },
  achCountText: { fontSize: 13, fontWeight: '700' },
  divisionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginBottom: spacing.xs },
  divisionText: { fontSize: 11, fontWeight: '700' },
  customPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  bannerEditBtn: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  photoSheet: { borderRadius: 20, padding: 16, marginHorizontal: 24, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdropTouch: { flex: 1 },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '80%' },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  pickerUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  pickerUploadText: { fontSize: 14, fontWeight: '600' },
  pickerSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 12, marginBottom: 10 },
  pickerCard: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1.5 },
});
