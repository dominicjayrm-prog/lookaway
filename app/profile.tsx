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
import { getFrameById, getBannerById, getNameColorById, getExpressionById, FRAMES, EXPRESSIONS, RARITY_COLORS } from '@/src/data/cosmetics';
import { Blink } from '@/src/components/Blink';
import type { BlinkExpression } from '@/src/components/Blink';

const isWeb = Platform.OS === 'web';

function loadProfilePic(): string | null { try { return localStorage.getItem('blanked-profile-pic'); } catch { return null; } }
function saveProfilePic(uri: string | null) { try { if (uri) localStorage.setItem('blanked-profile-pic', uri); else localStorage.removeItem('blanked-profile-pic'); } catch {} }

function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, isDark, isManual, toggleTheme, resetToSystem } = useTheme();
  const { totalStars, streakCount, getCompletedLevelCount, getMemoryScore, equippedFrame, equippedBanner, equippedNameColor } = useGameStore();
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

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { ownedCosmetics, equippedFrame: eqFrame, equippedExpression: eqExpr, purchaseCosmetic, equipCosmetic } = useGameStore();

  const handlePickPhoto = useCallback(() => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { const uri = reader.result as string; setProfilePic(uri); saveProfilePic(uri); };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert('Coming soon', 'Photo picker will be available on mobile devices.');
    }
    setShowAvatarPicker(false);
  }, []);
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
          <ProfileBanner banner={banner ?? null} height={120}>
            {/* Blink avatar sits on the banner */}
          </ProfileBanner>
          <View style={[styles.avatarSection, { marginTop: -50 }]}>
            <Pressable onPress={() => setShowAvatarPicker(true)} style={styles.avatarContainer}>
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

      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <View style={styles.pickerBackdrop}>
          <Pressable style={styles.pickerBackdropTouch} onPress={() => setShowAvatarPicker(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: colors.bg, maxWidth: Platform.OS === 'web' ? 430 : undefined, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose Avatar</Text>

            {/* Upload photo option */}
            <Pressable onPress={handlePickPhoto} style={[styles.pickerUploadBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="camera" size={20} color={colors.accent} />
              <Text style={[styles.pickerUploadText, { color: colors.text }]}>Upload photo</Text>
            </Pressable>

            {/* Clear photo if one is set */}
            {profilePic && (
              <Pressable onPress={() => { setProfilePic(null); saveProfilePic(null); setShowAvatarPicker(false); }} style={[styles.pickerUploadBtn, { backgroundColor: colors.wrongSoft, borderColor: colors.wrong + '30' }]}>
                <Ionicons name="close-circle" size={20} color={colors.wrong} />
                <Text style={[styles.pickerUploadText, { color: colors.wrong }]}>Remove photo (show Blink)</Text>
              </Pressable>
            )}

            {/* Blink frames grid */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textMid }]}>AVATAR FRAMES</Text>
            <FlatList
              data={FRAMES.filter(f => f.id !== 'frame_none')}
              numColumns={3}
              keyExtractor={f => f.id}
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
              columnWrapperStyle={{ gap: 10 }}
              renderItem={({ item: f, index: fIdx }) => {
                const owned = f.unlock === 'free' || ownedCosmetics.includes(f.id);
                const equipped = eqFrame === f.id;
                // Each frame shows a different Blink expression for variety
                const previewExpressions: BlinkExpression[] = ['normal', 'memorise', 'correct', 'streak', 'celebrate', 'love', 'thinking', 'surprised', 'sleeping', 'sad', 'wrong', 'blank'];
                const previewExpr = previewExpressions[fIdx % previewExpressions.length];
                return (
                  <Pressable
                    onPress={() => {
                      if (owned) {
                        equipCosmetic('frame', f.id);
                        setShowAvatarPicker(false);
                      } else if (f.gemCost) {
                        const ok = purchaseCosmetic(f.id, f.gemCost);
                        if (ok) { equipCosmetic('frame', f.id); setShowAvatarPicker(false); }
                        else Alert.alert('Not enough gems', `You need ${f.gemCost} gems.`);
                      } else if (f.subscriberOnly) {
                        Alert.alert('Blanked+ Required', 'Subscribe to Blanked+ to unlock this frame.');
                      } else if (f.achievementId) {
                        Alert.alert('Achievement Required', f.description);
                      }
                    }}
                    style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: equipped ? f.borderColor : colors.border, opacity: owned ? 1 : 0.5 }]}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: f.borderColor, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Blink expression={previewExpr} size={34} />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{f.name}</Text>
                    <Text style={{ fontSize: 8, color: RARITY_COLORS[f.rarity], fontWeight: '600' }}>{f.rarity.toUpperCase()}</Text>
                    {equipped && <Text style={{ fontSize: 8, color: colors.correct, fontWeight: '800', marginTop: 2 }}>EQUIPPED</Text>}
                    {!owned && f.gemCost && <Text style={{ fontSize: 9, color: colors.accent, fontWeight: '700', marginTop: 2 }}>{f.gemCost} gems</Text>}
                    {!owned && f.subscriberOnly && <Text style={{ fontSize: 8, color: colors.gold, fontWeight: '700', marginTop: 2 }}>BLANKED+</Text>}
                    {!owned && f.achievementId && !f.subscriberOnly && !f.gemCost && <Ionicons name="lock-closed" size={12} color={colors.textLight} style={{ marginTop: 2 }} />}
                  </Pressable>
                );
              }}
            />

            {/* Expressions section */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textMid }]}>EXPRESSIONS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 }}>
              {EXPRESSIONS.map(e => {
                const exprOwned = e.unlock === 'free' || ownedCosmetics.includes(e.id);
                const exprEquipped = eqExpr === e.id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => {
                      if (exprOwned) { equipCosmetic('expression', e.id); setShowAvatarPicker(false); }
                      else if (e.gemCost) {
                        const ok = purchaseCosmetic(e.id, e.gemCost);
                        if (ok) { equipCosmetic('expression', e.id); setShowAvatarPicker(false); }
                        else Alert.alert('Not enough gems', `You need ${e.gemCost} gems.`);
                      }
                    }}
                    style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: exprEquipped ? colors.accent : colors.border, opacity: exprOwned ? 1 : 0.5 }]}
                  >
                    <View style={{ marginBottom: 4 }}><Blink expression={e.blinkExpression} size={34} /></View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{e.name}</Text>
                    <Text style={{ fontSize: 8, color: RARITY_COLORS[e.rarity], fontWeight: '600' }}>{e.rarity.toUpperCase()}</Text>
                    {exprEquipped && <Text style={{ fontSize: 8, color: colors.correct, fontWeight: '800', marginTop: 2 }}>EQUIPPED</Text>}
                    {!exprOwned && e.gemCost && <Text style={{ fontSize: 9, color: colors.accent, fontWeight: '700', marginTop: 2 }}>{e.gemCost} gems</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
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
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xxl },
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
