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
import { CosmeticPicker } from '@/src/components/CosmeticPicker';
import { PowerUpViewer } from '@/src/components/PowerUpViewer';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

function loadProfilePic(): string | null { try { return localStorage.getItem('blanked-profile-pic'); } catch { return null; } }
function saveProfilePic(uri: string | null) { try { if (uri) localStorage.setItem('blanked-profile-pic', uri); else localStorage.removeItem('blanked-profile-pic'); } catch {} }

function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, isDark, isManual, toggleTheme, resetToSystem } = useTheme();
  const { totalStars, streakCount, getCompletedLevelCount, getMemoryScore, equippedFrame, equippedBanner, equippedNameColor, ownedCosmetics, equippedExpression: eqExpr, equipCosmetic } = useGameStore();
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const email = user?.email || 'Guest';
  const initials = displayName.slice(0, 2).toUpperCase();
  const [profilePic, setProfilePic] = useState<string | null>(loadProfilePic);
  const frame = getFrameById(equippedFrame);
  const banner = getBannerById(equippedBanner);
  const nameColor = getNameColorById(equippedNameColor);
  const nameStyle = nameColor && nameColor.color !== 'theme' ? { color: nameColor.color } : { color: colors.text };
  const eqExprCosmetic = getExpressionById(eqExpr);
  const eqFrame = equippedFrame;
  const profileBlink: BlinkExpression = eqExprCosmetic && eqExprCosmetic.blinkExpression !== 'normal'
    ? eqExprCosmetic.blinkExpression
    : streakCount >= 7 ? 'streak' : totalStars >= 300 ? 'celebrate' : memoryScore >= 80 ? 'correct' : 'normal';

  // Division badge
  const division = totalStars >= 800 ? { name: 'Master', emoji: '👑', color: '#D4A012' }
    : totalStars >= 500 ? { name: 'Diamond', emoji: '⭐', color: '#74B9FF' }
    : totalStars >= 300 ? { name: 'Platinum', emoji: '💎', color: '#A29BFE' }
    : totalStars >= 150 ? { name: 'Gold', emoji: '🥇', color: '#D4A012' }
    : totalStars >= 50 ? { name: 'Silver', emoji: '🥈', color: '#B2BEC3' }
    : { name: 'Bronze', emoji: '🥉', color: '#CD7F32' };

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
          saveProfilePic(uri);
          if (user?.id) uploadAvatar(user.id, uri).catch(() => {});
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfilePic(uri);
        saveProfilePic(uri);
        if (user?.id) uploadAvatar(user.id, uri).catch(() => {});
      }
    }
  }, [user?.id]);
  const handleSignOut = useCallback(async () => { try { await signOut(); setTimeout(() => router.replace('/(auth)/login'), 200); } catch { router.replace('/(auth)/login'); } }, [signOut, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Animated.View entering={isWeb ? undefined : FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile banner + avatar */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(100)}>
          <View style={{ position: 'relative' }}>
            <ProfileBanner banner={banner ?? null} height={120} />
            <Pressable onPress={() => setShowBannerPicker(true)} style={styles.bannerEditBtn}>
              <Ionicons name="pencil" size={12} color="#FFF" />
            </Pressable>
          </View>
          <View style={[styles.avatarSection, { marginTop: -44, paddingTop: 0 }]}>
            <Pressable onPress={() => setShowPhotoOptions(true)} style={styles.avatarContainer}>
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
            <Text style={[styles.displayName, nameStyle]}>{displayName}</Text>
            {/* Division badge */}
            <View style={[styles.divisionBadge, { backgroundColor: division.color + '18', borderColor: division.color + '30' }]}>
              <Text style={{ fontSize: 12 }}>{division.emoji}</Text>
              <Text style={[styles.divisionText, { color: division.color }]}>{division.name}</Text>
            </View>
            <Text style={[styles.email, { color: colors.textMid }]}>{email}</Text>

            {/* Customisation pill buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => setShowFramePicker(true)} style={[styles.customPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="ellipse-outline" size={14} color={colors.accent} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Frame</Text>
              </Pressable>
              <Pressable onPress={() => setShowExprPicker(true)} style={[styles.customPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="happy-outline" size={14} color={colors.accent} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Expression</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(200)}>
          <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.accent }]}>{completedCount > 0 ? `${memoryScore}%` : '--'}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>Memory</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.gold }]}>{totalStars}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>Stars</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.wrong }]}>{streakCount}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>Streak</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.correct }]}>{completedCount}</Text><Text style={[styles.statLabel, { color: colors.textMid }]}>Levels</Text></View>
          </View>
        </Animated.View>

        {/* Achievements card */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(250)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.settingsRow} onPress={() => router.push('/achievements')}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.goldSoft }]}>
                  <Ionicons name="medal" size={18} color={colors.gold} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Achievements</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>{unlockedCount}/{totalTiers} unlocked</Text>
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

        {/* Power-ups / Boosts card */}
        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(250)}>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.settingsRow} onPress={() => setShowPowerUpViewer(true)}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="flash" size={18} color={colors.blue} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Power-ups</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    {(() => {
                      const p = useGameStore.getState().powerUps;
                      const total = (p.slowTime ?? 0) + (p.peek ?? 0) + (p.fiftyFifty ?? 0) + (p.skip ?? 0) + (p.extra_life ?? 0);
                      return total > 0 ? `${total} boost${total !== 1 ? 's' : ''} available` : 'None — buy in the shop';
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
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>APPEARANCE</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(124,108,247,0.12)' : colors.accentSoft }]}><Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} /></View><View><Text style={[styles.settingsLabel, { color: colors.text }]}>Dark mode</Text><Text style={{ fontSize: 10, color: colors.textLight, marginTop: 1 }}>{isManual ? 'Manual' : 'Following system'}</Text></View></View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: colors.accent, false: colors.surface }} thumbColor="#FFFFFF" />
            </View>
            {isManual && (<><View style={[styles.divider, { backgroundColor: colors.border }]} /><Pressable style={styles.settingsRow} onPress={resetToSystem}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.surface }]}><Ionicons name="sync" size={16} color={colors.textMid} /></View><Text style={[styles.settingsLabel, { color: colors.textMid, fontSize: 13 }]}>Reset to system default</Text></View></Pressable></>)}
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <SettingsRow icon="volume-high" label="Sound effects" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="phone-portrait" label="Haptic feedback" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="notifications" label="Notifications" colors={colors} />
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>SOCIAL</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.settingsRow} onPress={() => router.push('/(tabs)/friends')}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.blueSoft }]}><Ionicons name="people" size={18} color={colors.blue} /></View><Text style={[styles.settingsLabel, { color: colors.text }]}>Friends</Text></View><View style={styles.settingsRowRight}><Ionicons name="chevron-forward" size={16} color={colors.textLight} /></View></Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.settingsRow} onPress={() => router.push('/(tabs)/friends')}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.goldSoft }]}><Ionicons name="trophy" size={18} color={colors.gold} /></View><Text style={[styles.settingsLabel, { color: colors.text }]}>Leaderboard</Text></View><View style={styles.settingsRowRight}><Ionicons name="chevron-forward" size={16} color={colors.textLight} /></View></Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={isWeb ? undefined : FadeInDown.duration(400).delay(600)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>ACCOUNT</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.settingsRow} onPress={handleSignOut}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}><Ionicons name="log-out" size={18} color={colors.wrong} /></View><Text style={[styles.settingsLabel, { color: colors.wrong }]}>Sign out</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textLight} /></Pressable>
          </View>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textLight }]}>BLANKED v1.0.0</Text>
      </ScrollView>

      {/* Photo Options Modal (simple) */}
      <Modal visible={showPhotoOptions} transparent animationType="fade" onRequestClose={() => setShowPhotoOptions(false)}>
        <Pressable style={[styles.pickerBackdrop, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={() => setShowPhotoOptions(false)}>
          <View style={[styles.photoSheet, { backgroundColor: colors.card }]}>
            <Pressable onPress={() => { handlePickPhoto(); setShowPhotoOptions(false); }} style={[styles.pickerUploadBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Ionicons name="camera" size={18} color={colors.accent} />
              <Text style={[styles.pickerUploadText, { color: colors.text }]}>Upload photo</Text>
            </Pressable>
            {profilePic && (
              <Pressable onPress={() => { setProfilePic(null); saveProfilePic(null); setShowPhotoOptions(false); if (user?.id) removeAvatar(user.id).catch(() => {}); }} style={[styles.pickerUploadBtn, { backgroundColor: colors.wrongSoft, borderColor: colors.wrong + '30' }]}>
                <Ionicons name="close-circle" size={18} color={colors.wrong} />
                <Text style={[styles.pickerUploadText, { color: colors.wrong }]}>Remove photo</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Frame Picker */}
      <CosmeticPicker
        visible={showFramePicker}
        onDismiss={() => setShowFramePicker(false)}
        title="Change Frame"
        ownedItems={frameData.owned}
        lockedItems={frameData.locked}
        equippedId={eqFrame}
        onEquip={(id) => equipCosmetic('frame', id)}
        renderPreview={(item) => (
          <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: (item as any).borderColor ?? colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Blink expression="normal" size={34} />
          </View>
        )}
      />

      {/* Expression Picker */}
      <CosmeticPicker
        visible={showExprPicker}
        onDismiss={() => setShowExprPicker(false)}
        title="Change Expression"
        ownedItems={exprData.owned}
        lockedItems={exprData.locked}
        equippedId={eqExpr}
        onEquip={(id) => equipCosmetic('expression', id)}
        renderPreview={(item) => (
          <View style={{ marginBottom: 4 }}>
            <Blink expression={(item as any).blinkExpression ?? 'normal'} size={40} />
          </View>
        )}
      />

      {/* Banner Picker */}
      <CosmeticPicker
        visible={showBannerPicker}
        onDismiss={() => setShowBannerPicker(false)}
        title="Change Banner"
        ownedItems={bannerData.owned}
        lockedItems={bannerData.locked}
        equippedId={equippedBanner}
        onEquip={(id) => equipCosmetic('banner', id)}
        renderPreview={(item) => (
          <LinearGradient
            colors={(item as any).gradientColors ?? ['#6C5CE7', '#A29BFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 60, height: 28, borderRadius: 8 }}
          />
        )}
      />

      {/* Power-up Viewer */}
      <PowerUpViewer visible={showPowerUpViewer} onDismiss={() => setShowPowerUpViewer(false)} />
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, colors }: { icon: string; label: string; colors: any }) {
  return (<View style={styles.settingsRow}><View style={styles.settingsRowLeft}><View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={icon as any} size={18} color={colors.accent} /></View><Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text></View><Switch value={true} trackColor={{ true: colors.accent, false: colors.surface }} thumbColor="#FFFFFF" /></View>);
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
