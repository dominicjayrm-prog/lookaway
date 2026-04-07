import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabTransition } from '@/src/components/TabTransition';
import TutorialOverlay from '@/src/components/TutorialOverlay';
import DailyLoginReward from '@/src/components/DailyLoginReward';
import WeeklyChallengesCard from '@/src/components/WeeklyChallengesCard';
import { checkDailyReward } from '@/src/utils/dailyLoginRewards';
import { useGameStore } from '@/src/store';
import { OutOfLivesModal } from '@/src/components/OutOfLivesModal';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { fetchLevelById } from '@/src/data/levels';
import { getRecentActivity, getTimeAgo } from '@/src/utils/activity';
import type { ActivityEvent } from '@/src/utils/activity';
import Svg, { Path, Circle, Polygon, Rect } from 'react-native-svg';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { Blink } from '@/src/components/Blink';
import type { BlinkExpression } from '@/src/components/AnimatedBlink';

const WORLD_COLORS = ['#00B894','#0984E3','#6C5CE7','#D4A012','#FF6B6B','#1A1A18'];
const WORLD_NAMES = ['Shapes','Colour','Numbers','Motion','Photo','Master'];
const WORLD_LEVEL_COUNTS = [20, 30, 35, 35, 40, 40];
const EMDASH = String.fromCharCode(8212);

function getHomeBlink(streakCount: number, lives: number): BlinkExpression {
  if (streakCount >= 7) return 'streak';
  if (lives <= 0) return 'sad';
  return 'normal';
}

function getHomeGreeting(streakCount: number): string {
  if (streakCount >= 3) return `Day ${streakCount}! Keep it going 🔥`;
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning! Ready to train?';
  if (h >= 12 && h < 17) return "Let's exercise that memory";
  if (h >= 17 && h < 21) return 'Evening brain boost?';
  return 'Quick round before bed?';
}

function StarIcon({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
}


function ActivityIcon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case 'level_complete': return <Svg width={14} height={14} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
    case 'world_complete': return <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6,4 L6,2 L18,2 L18,4 M5,4 L19,4 L19,8 C19,11 17,13 14,13 L14,16 L17,19 L17,20 L7,20 L7,19 L10,16 L10,13 C7,13 5,11 5,8Z" fill={color} /></Svg>;
    case 'streak_milestone': return <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12,2 C12,2 8,8 8,12 C8,15 10,17 12,17 C14,17 16,15 16,12 C16,8 12,2 12,2Z" fill={color} /></Svg>;
    case 'challenge_won': return <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5,16 L3,6 L8,10 L12,4 L16,10 L21,6 L19,16Z" fill={color} /><Rect x={4} y={16} width={16} height={3} rx={1} fill={color} /></Svg>;
    case 'challenge_lost': return <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5,16 L3,6 L8,10 L12,4 L16,10 L21,6 L19,16Z" fill={color} /><Rect x={4} y={16} width={16} height={3} rx={1} fill={color} /></Svg>;
    case 'friend_added': return <Svg width={14} height={14} viewBox="0 0 24 24"><Circle cx={12} cy={7} r={4} fill={color} /><Path d="M4,21 Q4,14 12,14 Q20,14 20,21" fill={color} /></Svg>;
    case 'star_improved': return <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12,4 L5,12 L9,12 L9,20 L15,20 L15,12 L19,12Z" fill={color} /></Svg>;
    case 'powerup_bought': return <Svg width={14} height={14} viewBox="0 0 24 24"><Polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} /></Svg>;
    default: return <Svg width={14} height={14} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8} fill={color} /></Svg>;
  }
}

function getActivityDisplay(event: ActivityEvent): { iconColor: string; iconBg: string; main: string; sub: string } {
  const d = event.data;
  const t = getTimeAgo(event.timestamp);
  switch (event.type) {
    case 'level_complete': return { iconColor: '#D4A012', iconBg: 'rgba(212,160,18,0.1)', main: `Completed ${d.title || `Level ${d.levelNumber}`}`, sub: `World ${d.worldId} · ${d.stars} star${(d.stars as number) !== 1 ? 's' : ''} · ${t}` };
    case 'world_complete': return { iconColor: '#6C5CE7', iconBg: 'rgba(108,92,231,0.1)', main: `Finished ${d.worldName}!`, sub: `World complete · ${t}` };
    case 'streak_milestone': return { iconColor: '#FF9500', iconBg: 'rgba(255,149,0,0.1)', main: `${d.days}-day streak!`, sub: `Earned ${d.gems} gems · ${t}` };
    case 'challenge_won': return { iconColor: '#00B894', iconBg: 'rgba(0,184,148,0.1)', main: `Beat @${d.opponent}`, sub: `${d.myScore}% to ${d.theirScore}% · ${t}` };
    case 'challenge_lost': return { iconColor: '#FF6B6B', iconBg: 'rgba(255,107,107,0.1)', main: `Lost to @${d.opponent}`, sub: `${d.myScore}% to ${d.theirScore}% · ${t}` };
    case 'friend_added': return { iconColor: '#0984E3', iconBg: 'rgba(9,132,227,0.1)', main: `Added @${d.username}`, sub: `New friend · ${t}` };
    case 'star_improved': return { iconColor: '#00B894', iconBg: 'rgba(0,184,148,0.1)', main: `Improved Level ${d.levelNumber}`, sub: `${d.oldStars}→${d.newStars} stars · ${t}` };
    case 'powerup_bought': return { iconColor: '#6C5CE7', iconBg: 'rgba(108,92,231,0.1)', main: `Bought power-up`, sub: `Shop · ${t}` };
    default: return { iconColor: '#636E72', iconBg: 'rgba(0,0,0,0.05)', main: 'Activity', sub: t };
  }
}

function RecentActivityCard({ colors, router }: { colors: Record<string, string>; router: ReturnType<typeof useRouter> }) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  useEffect(() => { getRecentActivity(3).then(setActivities); }, []);

  return (
    <View style={[actStyles.card, { backgroundColor: colors.card }]}>
      <Text style={[actStyles.title, { color: colors.text }]}>Recent Activity</Text>
      {activities.length === 0 ? (
        <View style={actStyles.emptyContainer}>
          <Text style={[actStyles.emptyTitle, { color: colors.textMid }]}>Your story starts here</Text>
          <Text style={[actStyles.emptySub, { color: colors.textLight }]}>Complete a level to see your activity appear!</Text>
        </View>
      ) : (
        activities.map((event, i) => {
          const display = getActivityDisplay(event);
          return (
            <Pressable key={event.id} style={[actStyles.row, i < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }]}
              onPress={() => {
                if (event.type === 'level_complete' || event.type === 'star_improved') router.push(`/world/${event.data.worldId}`);
                else if (event.type === 'world_complete') router.push('/(tabs)/journey');
                else if (event.type === 'challenge_won' || event.type === 'challenge_lost' || event.type === 'friend_added') router.push('/(tabs)/friends');
                else if (event.type === 'powerup_bought') router.push('/(tabs)/shop');
              }}
            >
              <View style={[actStyles.iconBox, { backgroundColor: display.iconBg }]}>
                <ActivityIcon type={event.type} color={display.iconColor} />
              </View>
              <View style={actStyles.textCol}>
                <Text style={[actStyles.mainText, { color: colors.text }]} numberOfLines={1}>{display.main}</Text>
                <Text style={[actStyles.subText, { color: colors.textLight }]} numberOfLines={1}>{display.sub}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const actStyles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptySub: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  mainText: { fontSize: 13, fontWeight: '600' },
  subText: { fontSize: 11, marginTop: 1 },
});

function PlayTab() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { gems, lives, streakCount, totalStars, getNextUnplayedLevelId, getMemoryScore, getCompletedLevelCount, levelProgress } = useGameStore();
  const nextLevelId = getNextUnplayedLevelId(); // Re-computes when levelProgress changes

  // Parse world/level from ID format "w1-l3"
  const idMatch = nextLevelId.match(/^w(\d+)-l(\d+)$/);
  const currentWorldId = idMatch ? parseInt(idMatch[1], 10) : 1;
  const nextLevelNumber = idMatch ? parseInt(idMatch[2], 10) : 1;
  const currentWorldLevels = WORLD_LEVEL_COUNTS[(currentWorldId - 1)] ?? 20;
  const completedCount = getCompletedLevelCount();
  const worldProgress = Math.max(0, nextLevelNumber - 1) / currentWorldLevels;
  const memoryScore = getMemoryScore();

  // Fetch level title from Supabase
  const [nextLevelTitle, setNextLevelTitle] = useState('Loading...');
  useEffect(() => {
    fetchLevelById(nextLevelId).then(l => setNextLevelTitle(l?.title ?? `Level ${nextLevelNumber}`));
  }, [nextLevelId, nextLevelNumber]);

  // Contextual hero subtitle
  const heroSubtitle = (() => {
    const remaining = currentWorldLevels - (nextLevelNumber - 1);
    if (nextLevelNumber === 1) return `Welcome to World ${currentWorldId}`;
    if (remaining <= 3) return `${remaining} level${remaining !== 1 ? 's' : ''} to finish World ${currentWorldId}!`;
    if (streakCount >= 3) return `${streakCount}-day streak! Keep it going`;
    const subs = ['Keep pushing forward', 'Your memory is getting sharper', "Let's test that memory", 'Ready for the next challenge?'];
    return subs[nextLevelNumber % subs.length];
  })();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const initials = displayName.slice(0, 2).toUpperCase();
  let profilePic: string | null = null;
  try { profilePic = typeof window !== 'undefined' ? localStorage.getItem('blanked-profile-pic') : null; } catch {}

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSpots, setTutorialSpots] = useState<({ x: number; y: number; width: number; height: number } | null)[]>([]);
  const heroRef = useRef<View>(null);
  const livesRef = useRef<View>(null);
  const gemsRef = useRef<View>(null);

  // Daily login reward
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('blanked_tutorial_seen').then(seen => {
      if (!seen) {
        setTimeout(() => setShowTutorial(true), 800);
      } else {
        // Only show daily reward if tutorial is done
        checkDailyReward().then(check => {
          if (check?.available) setTimeout(() => setShowDailyReward(true), 500);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!showTutorial) return;
    const timer = setTimeout(() => {
      const spots: ({ x: number; y: number; width: number; height: number } | null)[] = [null, null, null, null, null];
      let measured = 0;
      const check = () => { measured++; if (measured >= 3) setTutorialSpots([...spots]); };

      // Use measureInWindow for absolute screen coordinates
      [heroRef, livesRef, gemsRef].forEach((ref, idx) => {
        if (ref.current) {
          ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
            if (w > 0 && h > 0) spots[idx] = { x, y, width: w, height: h };
            check();
          });
        } else {
          check();
        }
      });

      // Tab bar icons — calculate based on container width (max 430px on web)
      const sw = Dimensions.get('window').width;
      const containerW = Math.min(sw, 430); // MobileContainer caps at 430px
      const containerX = (sw - containerW) / 2; // centered offset on web
      const sh = Dimensions.get('window').height;
      const tabW = containerW / 4;
      const iconSize = 44; // approximate icon tap target size
      const tabY = sh - 58;
      // Journey is 2nd tab (index 1), center the icon within its tab slot
      const journeyCenter = containerX + tabW * 1 + tabW / 2;
      spots[3] = { x: journeyCenter - iconSize / 2, y: tabY, width: iconSize, height: iconSize };
      // Shop is 4th tab (index 3)
      const shopCenter = containerX + tabW * 3 + tabW / 2;
      spots[4] = { x: shopCenter - iconSize / 2, y: tabY, width: iconSize, height: iconSize };
    }, 800);
    return () => clearTimeout(timer);
  }, [showTutorial]);

  const completeTutorial = useCallback(async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem('blanked_tutorial_seen', 'true');
  }, []);

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View ref={livesRef} collapsable={false} style={[styles.livesPill, { backgroundColor: colors.wrongSoft }]}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name={i < lives ? 'heart' : 'heart-outline'} size={15} color={i < lives ? colors.wrong : colors.textLight} />
            ))}
          </View>
          <View style={styles.topBarRight}>
            <View ref={gemsRef} collapsable={false} style={[styles.gemPill, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="diamond" size={13} color={colors.accent} />
              <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
            </View>
            <Pressable
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileImage} />
              ) : (
                <Blink expression="normal" size={32} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero card — purple gradient */}
        <View ref={heroRef} collapsable={false} style={styles.heroCardOuter}>
          <LinearGradient colors={['#6C5CE7', '#5B4CC8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          {/* Logo row */}
          <View style={styles.heroLogoRow}>
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <AnimatedBlink expression={getHomeBlink(streakCount, lives)} size={36} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.heroLogoText}>Blank<Text style={{ fontWeight: '800' }}>ed</Text></Text>
              <Text style={styles.heroLogoSub}>{getHomeGreeting(streakCount)}</Text>
            </View>
          </View>

          {/* Level info */}
          <Text style={styles.heroContinueLabel}>CONTINUE</Text>
          <Text style={styles.heroLevelTitle}>{`World ${currentWorldId} ${EMDASH} Level ${nextLevelNumber}`}</Text>
          <Text style={styles.heroLevelSubtitle}>{heroSubtitle}</Text>

          {/* Progress bar */}
          <View style={styles.heroProgressRow}>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${Math.round(worldProgress * 100)}%` }]} />
            </View>
            <Text style={styles.heroProgressText}>{nextLevelNumber - 1}/{currentWorldLevels}</Text>
          </View>

          {/* Play button with press animation */}
          <Pressable
            style={({ pressed }) => [styles.heroPlayButton, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
            onPress={() => {
              useGameStore.getState().checkLifeRegen();
              if (useGameStore.getState().lives <= 0) { setShowOutOfLives(true); return; }
              router.push(`/game/${nextLevelId}`);
            }}
          >
            <Text style={styles.heroPlayText}>Play</Text>
          </Pressable>
        </LinearGradient>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.accentSoft }]}>
              <Svg width={16} height={12} viewBox="0 0 36 24"><Path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="none" stroke={colors.accent} strokeWidth={1.8} /><Circle cx={18} cy={12} r={4} fill={colors.accent} /><Circle cx={18} cy={12} r={2} fill="white" /></Svg>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>BRAIN</Text>
            <Text style={[styles.statValue, { color: completedCount > 0 ? colors.accent : colors.textLight }]}>
              {completedCount > 0 ? `${memoryScore}%` : EMDASH}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.goldSoft }]}>
              <StarIcon size={13} color={colors.gold} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>STARS</Text>
            <Text style={[styles.statValue, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/600</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.wrongSoft }]}>
              <Text style={{ fontSize: 12 }}>{'\u{1F525}'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>STREAK</Text>
            <Text style={[styles.statValue, { color: streakCount > 0 ? colors.wrong : colors.textLight }]}>{streakCount}</Text>
          </View>
        </View>

        {/* Your Journey */}
        <View style={[styles.journeyCard, { backgroundColor: colors.card }]}>
          <View style={styles.journeyHeader}>
            <Text style={[styles.journeyTitle, { color: colors.text }]}>Your Journey</Text>
            <Pressable onPress={() => router.push('/(tabs)/journey')}>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>See all {'>'}</Text>
            </Pressable>
          </View>
          <View style={styles.journeyPills}>
            {WORLD_NAMES.map((name, i) => {
              const wc = WORLD_COLORS[i];
              const isCurrentWorld = i + 1 === currentWorldId;
              const isCompleted = i + 1 < currentWorldId;
              const isLocked = i + 1 > currentWorldId;
              return (
                <View key={i} style={[styles.worldPill, {
                  backgroundColor: isCurrentWorld || isCompleted ? wc + '12' : wc + '06',
                  borderWidth: isCurrentWorld ? 1.5 : isCompleted ? 1 : 1,
                  borderColor: isCurrentWorld ? wc + '35' : isCompleted ? wc + '20' : wc + '10',
                  opacity: isLocked ? 0.7 : 1,
                }]}>
                  <Text style={[styles.worldPillNum, { color: isCurrentWorld || isCompleted ? wc : wc + '80' }]}>{i + 1}</Text>
                  <Text style={[styles.worldPillName, { color: isCurrentWorld || isCompleted ? wc : wc + '60' }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly Challenges */}
        <WeeklyChallengesCard />

        {/* Recent Activity */}
        <RecentActivityCard colors={colors} router={router} />

      </ScrollView>

      {/* Tutorial overlay for first-time users */}
      {/* Daily login reward popup */}
      <DailyLoginReward visible={showDailyReward} onDismiss={() => setShowDailyReward(false)} />

      {/* Tutorial overlay for first-time users */}
      <OutOfLivesModal
        visible={showOutOfLives}
        onClose={() => setShowOutOfLives(false)}
        onGoToShop={() => { setShowOutOfLives(false); router.push('/(tabs)/shop'); }}
        onGoToBlankedPlus={() => { setShowOutOfLives(false); setShowPaywall(true); }}
      />
      <SubscriptionPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} onSubscribe={() => setShowPaywall(false)} />
      <TutorialOverlay visible={showTutorial && tutorialSpots.length === 5} spotlights={tutorialSpots} onComplete={completeTutorial} />
    </SafeAreaView>
    </TabTransition>
  );
}

export default PlayTab;
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  gemPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  gemCount: { fontSize: 12, fontWeight: '700' },
  profileButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: 32, height: 32, borderRadius: 16 },
  profileInitials: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // Hero card
  heroCardOuter: { marginHorizontal: 16, marginTop: 8, borderRadius: 24, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 8 },
  heroCard: { borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, overflow: 'hidden',
  },
  heroLogoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroLogoBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroLogoText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroLogoSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  heroContinueLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  heroLevelTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  heroLevelSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  heroProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#FFFFFF' },
  heroProgressText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  heroPlayButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  heroPlayText: { fontSize: 17, fontWeight: '700', color: '#6C5CE7' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 14 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  statIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },

  // Journey
  journeyCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  journeyTitle: { fontSize: 13, fontWeight: '700' },
  journeyPills: { flexDirection: 'row', gap: 6 },
  worldPill: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  worldPillNum: { fontSize: 12, fontWeight: '700' },
  worldPillName: { fontSize: 8, fontWeight: '600', marginTop: 1 },

});
