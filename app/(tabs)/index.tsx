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
import { DailyChallengeCard } from '@/src/features/dailyChallenge/views/DailyChallengeCard';
import { NotificationPrompt } from '@/src/components/NotificationPrompt';
import {
  shouldShowFirstRunNotifPrompt,
  markNotifPromptAsked,
  requestNotificationPermission,
  registerPushToken,
} from '@/src/utils/notifications';
import { checkDailyReward } from '@/src/utils/dailyLoginRewards';
import { useGameStore } from '@/src/store';
import { purchaseSubscription } from '@/src/lib/purchases';
import { OutOfLivesModal } from '@/src/components/OutOfLivesModal';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import DiscountPaywall from '@/src/components/DiscountPaywall';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';

import { getRecentActivity, getTimeAgo } from '@/src/utils/activity';
import type { ActivityEvent } from '@/src/utils/activity';
import Svg, { Path, Circle, Polygon, Rect } from 'react-native-svg';
import { Blink } from '@/src/components/Blink';
import { getExpressionById } from '@/src/data/cosmetics';
import { InfoCard } from '@/src/components/InfoCard';
import { PremiumCelebration } from '@/src/components/PremiumCelebration';
import { AnimatedGemCount } from '@/src/components/AnimatedGemCount';
import { getNextMilestone } from '@/src/data/streakMilestones';
import { supabase } from '@/src/lib/supabase';
import { StreakRecoveryModal } from '@/src/components/StreakRecoveryModal';
import { t } from '@/src/i18n';
import {
  getDaysMissed,
  RECOVERY_WINDOW_MS,
} from '@/src/utils/streakRecovery';
import {
  getUnifiedLevel,
} from '@/src/data/unifiedJourney';
import { CAMPAIGNS } from '@/src/data/campaigns';

const WORLD_COLORS = ['#00B894','#0984E3','#6C5CE7','#D4A012','#FF6B6B','#1A1A18'];
// World names resolve via t() inside the component body so switching
// language updates the pill labels without a remount.
const WORLD_NAME_KEYS = ['home.worlds.shapes','home.worlds.colour','home.worlds.numbers','home.worlds.motion','home.worlds.photo','home.worlds.master'] as const;
const WORLD_LEVEL_COUNTS = [20, 30, 35, 35, 40, 40];
const EMDASH = String.fromCharCode(8212);

function getHomeGreeting(streakCount: number): string {
  if (streakCount >= 3) return t('home.greeting_streak', { count: streakCount });
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return t('home.greeting_morning');
  if (h >= 12 && h < 17) return t('home.greeting_afternoon');
  if (h >= 17 && h < 21) return t('home.greeting_evening');
  return t('home.greeting_night');
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
    // Lightning bolt — used for any side-game / challenge mode completion (SnapMatch, Speed Recall, Spot the Change, Sequence, Counting Blitz, Colour Chain)
    case 'mode_complete': return <Svg width={14} height={14} viewBox="0 0 24 24"><Polygon points="13,2 4,13 11,13 9,22 20,10 13,10" fill={color} /></Svg>;
    default: return <Svg width={14} height={14} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8} fill={color} /></Svg>;
  }
}

function getActivityDisplay(event: ActivityEvent): { iconColor: string; iconBg: string; main: string; sub: string } {
  const d = event.data;
  const time = getTimeAgo(event.timestamp);
  switch (event.type) {
    case 'level_complete': {
      const title = (d.title as string) || t('home.activity.level_complete_title_default', { number: d.levelNumber });
      const stars = d.stars as number;
      return {
        iconColor: '#D4A012', iconBg: 'rgba(212,160,18,0.1)',
        main: t('home.activity.level_complete_main', { title }),
        sub: stars === 1
          ? t('home.activity.level_complete_sub_one', { world: d.worldId, time })
          : t('home.activity.level_complete_sub_many', { world: d.worldId, stars, time }),
      };
    }
    case 'world_complete': {
      const wid = typeof d.worldId === 'number' ? d.worldId : 0;
      const key = WORLD_NAME_KEYS[wid - 1];
      const localisedWorldName = key ? t(key) : (d.worldName as string) ?? '';
      return { iconColor: '#6C5CE7', iconBg: 'rgba(108,92,231,0.1)', main: t('home.activity.world_complete_main', { name: localisedWorldName }), sub: t('home.activity.world_complete_sub', { time }) };
    }
    case 'streak_milestone': return { iconColor: '#FF9500', iconBg: 'rgba(255,149,0,0.1)', main: t('home.activity.streak_milestone_main', { days: d.days }), sub: t('home.activity.streak_milestone_sub', { gems: d.gems, time }) };
    case 'challenge_won': return { iconColor: '#00B894', iconBg: 'rgba(0,184,148,0.1)', main: t('home.activity.challenge_won_main', { opponent: d.opponent }), sub: t('home.activity.challenge_score', { mine: d.myScore, theirs: d.theirScore, time }) };
    case 'challenge_lost': return { iconColor: '#FF6B6B', iconBg: 'rgba(255,107,107,0.1)', main: t('home.activity.challenge_lost_main', { opponent: d.opponent }), sub: t('home.activity.challenge_score', { mine: d.myScore, theirs: d.theirScore, time }) };
    case 'friend_added': return { iconColor: '#0984E3', iconBg: 'rgba(9,132,227,0.1)', main: t('home.activity.friend_added_main', { username: d.username }), sub: t('home.activity.friend_added_sub', { time }) };
    case 'star_improved': return { iconColor: '#00B894', iconBg: 'rgba(0,184,148,0.1)', main: t('home.activity.star_improved_main', { number: d.levelNumber }), sub: t('home.activity.star_improved_sub', { old: d.oldStars, new: d.newStars, time }) };
    case 'powerup_bought': return { iconColor: '#6C5CE7', iconBg: 'rgba(108,92,231,0.1)', main: t('home.activity.powerup_bought_main'), sub: t('home.activity.powerup_bought_sub', { time }) };
    case 'mode_complete': {
      const modeName = (d.modeName as string) ?? t('home.activity.mode_fallback');
      const hasPct = typeof d.scorePct === 'number';
      return {
        iconColor: '#0984E3', iconBg: 'rgba(9,132,227,0.1)',
        main: t('home.activity.mode_complete_main', { name: modeName }),
        sub: hasPct
          ? t('home.activity.mode_complete_sub', { pct: d.scorePct, time })
          : t('home.activity.mode_complete_sub_no_score', { time }),
      };
    }
    default: return { iconColor: '#636E72', iconBg: 'rgba(0,0,0,0.05)', main: t('home.activity.generic'), sub: time };
  }
}

function RecentActivityCard({ colors, router }: { colors: Record<string, string>; router: ReturnType<typeof useRouter> }) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  useEffect(() => { getRecentActivity(3).then(setActivities); }, []);

  return (
    <View style={[actStyles.card, { backgroundColor: colors.card }]}>
      <Text style={[actStyles.title, { color: colors.text }]}>{t('home.activity.title')}</Text>
      {activities.length === 0 ? (
        <View style={actStyles.emptyContainer}>
          <Text style={[actStyles.emptyTitle, { color: colors.textMid }]}>{t('home.activity.empty_title')}</Text>
          <Text style={[actStyles.emptySub, { color: colors.textLight }]}>{t('home.activity.empty_sub')}</Text>
        </View>
      ) : (
        activities.map((event, i) => {
          const display = getActivityDisplay(event);
          return (
            <Pressable key={event.id} style={[actStyles.row, i < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }]}
              accessibilityRole="button"
              accessibilityLabel={`${display.main}. ${display.sub}`}
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
  const { gems, lives, streakCount, totalStars, getNextUnplayedLevelId, getMemoryScore, getCompletedLevelCount, levelProgress, equippedExpression, avatarUrl: storeAvatarUrl, streakMilestonesClaimed, streakShields, recoveryWindowStart, lastPlayDate, setRecoveryWindowStart, applyStreakRecoveryLocal, resetStreakLocal, unifiedPosition } = useGameStore();
  // Next milestone teaser shown under the streak number on the home card.
  // Derived locally — claimed list is mirrored from Supabase by the
  // result-screen claim path.
  const nextStreakReward = getNextMilestone(streakCount, streakMilestonesClaimed);
  const nextLevelId = getNextUnplayedLevelId(); // Re-computes when levelProgress changes

  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();

  // Fetch level title from Supabase

  // Contextual hero subtitle — driven by the unified journey cursor now
  // that the campaign is one linear ladder. Still falls back to
  // streak / variety messages when there's nothing special to say.
  const TOTAL_LADDER = 380;
  const heroSubtitle = (() => {
    const remaining = TOTAL_LADDER - unifiedPosition;
    if (unifiedPosition === 1) return t('home.welcome_unified');
    if (remaining <= 5 && remaining > 0) {
      return remaining === 1
        ? t('home.final_level')
        : t('home.final_levels', { count: remaining });
    }
    if (remaining === 0) return t('home.journey_complete');
    if (streakCount >= 3) return t('home.streak_keep_going', { count: streakCount });
    const subKeys = ['home.subtitle_1', 'home.subtitle_2', 'home.subtitle_3', 'home.subtitle_4'];
    return t(subKeys[unifiedPosition % subKeys.length]);
  })();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || t('common.player');
  const initials = displayName.slice(0, 2).toUpperCase();
  // Profile pic priority: cloud avatar_url (cross-device) → locally
  // cached URI for THIS user id (offline / during upload). The cache
  // key is scoped per user so switching accounts on the same device
  // never leaks one account's photo into another's UI.
  const profilePicCacheKey = user?.id ? `blanked-profile-pic::${user.id}` : null;
  let profilePicSync: string | null = storeAvatarUrl ?? null;
  if (!profilePicSync && profilePicCacheKey) {
    try { profilePicSync = typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? localStorage.getItem(profilePicCacheKey) : null; } catch {}
  }
  const [cachedProfilePic, setCachedProfilePic] = useState<string | null>(null);
  useEffect(() => {
    // Unconditionally wipe the legacy global key on every mount
    // (pre-per-user-scoping), so the cached photo from a different
    // account on the same device stops showing up top-right.
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem('blanked-profile-pic'); } catch {}
    AsyncStorage.removeItem('blanked-profile-pic').catch(() => {});
    if (storeAvatarUrl) { setCachedProfilePic(null); return; }
    if (!profilePicCacheKey) { setCachedProfilePic(null); return; }
    let cancelled = false;
    AsyncStorage.getItem(profilePicCacheKey)
      .then((v) => { if (!cancelled) setCachedProfilePic(v ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeAvatarUrl, profilePicCacheKey]);
  const profilePic = profilePicSync ?? cachedProfilePic;

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSpots, setTutorialSpots] = useState<({ x: number; y: number; width: number; height: number } | null)[]>([]);
  const heroRef = useRef<View>(null);
  const livesRef = useRef<View>(null);
  const gemsRef = useRef<View>(null);

  // Daily login reward
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [infoCard, setInfoCard] = useState<string | null>(null);

  // First-run notification pre-permission popup. Fires once per account
  // after the player lands on the home tab, 3 seconds in so the tutorial
  // + daily reward modals finish first. Gated by AsyncStorage +
  // profile.has_seen_notif_prompt so it never repeats across devices.
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        if (await shouldShowFirstRunNotifPrompt(user.id)) {
          setTimeout(() => { if (!cancelled) setShowNotifPrompt(true); }, 3000);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Streak recovery state ─────────────────────────────────
  const [recoveryModal, setRecoveryModal] = useState<{ streak: number; daysMissed: number } | null>(null);
  // Force a re-render every 30s while the recovery window is active so
  // the "X min to recover" label ticks down without an explicit timer state.
  const [, forceTickRerender] = useState(0);
  useEffect(() => {
    if (!recoveryWindowStart) return;
    const id = setInterval(() => forceTickRerender((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [recoveryWindowStart]);

  const recoveryMinsRemaining = (() => {
    if (!recoveryWindowStart) return null;
    const elapsed = Date.now() - new Date(recoveryWindowStart).getTime();
    const remaining = RECOVERY_WINDOW_MS - elapsed;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 60_000);
  })();
  const inRecoveryWindow = recoveryMinsRemaining !== null && recoveryMinsRemaining > 0;

  const recoveryDaysMissed = getDaysMissed(lastPlayDate);

  // Auto streak-recovery check now lives in the root layout
  // (StreakRecoveryMounter in app/_layout.tsx) so the popup fires
  // regardless of which tab is mounted on app open. Previously this
  // useEffect was the only entry point, so a player who reopened
  // the app on the journey/friends/shop tab on iOS never saw the
  // recovery modal and silently churned past the 1-hour window. The
  // home tab keeps its MANUAL banner trigger below (tap the streak
  // banner) but no longer races the root mounter on launch.

  // Simple toast state for the shield auto-used confirmation
  const [toast, setToast] = useState<{ title: string; tone: 'success' | 'info' } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  // The discount paywall is the second-chance offer surfaced when the
  // user dismisses the regular paywall during the post-signup flow.
  // It only fires once per device (via blanked_discount_paywall_seen).
  const [showDiscountPaywall, setShowDiscountPaywall] = useState(false);
  // True when the currently-visible paywall came from the post-signup
  // flow vs other entry points (out-of-lives, stats space, shop).
  // Only post-signup dismissals chain to the discount paywall.
  const postSignupPaywallActive = useRef(false);
  // Defers the spotlight tutorial until the post-signup paywall flow
  // (regular paywall + optional discount paywall) has finished. The
  // tutorial would otherwise fire 800ms after auth and stack on top of
  // the paywall card, which produced the "1 OF 5 - Start here" tooltip
  // floating over the Subscribe button. Default true (existing users
  // never queued a paywall, so the tour fires immediately).
  const [postSignupPaywallDone, setPostSignupPaywallDone] = useState(true);

  // Post-signup paywall: onboarding dropped a flag for us to surface
  // the paywall the first time the user lands on home with an active
  // session. Anonymous purchases would otherwise leak entitlements
  // onto a device id with no recovery path; running it here means the
  // purchase is always attached to a real user account.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('blanked_show_paywall_after_signup');
        if (cancelled || flag !== 'true') return;
        await AsyncStorage.removeItem('blanked_show_paywall_after_signup');
        // Block the tutorial trigger while the paywall flow is live.
        // Cleared in every paywall-closed code path below.
        setPostSignupPaywallDone(false);
        // Tiny delay so home renders before the paywall animates over
        // it. Without this the paywall covers the home tab before any
        // greeting has a chance to show, which is jarring.
        setTimeout(() => {
          if (!cancelled) {
            postSignupPaywallActive.current = true;
            setShowPaywall(true);
          }
        }, 600);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    // Tutorial-seen check: AsyncStorage first for instant decisions, then
    // fall back to the server flag so a fresh device install for a
    // returning player skips the spotlight tour.
    //
    // CRITICAL: the cache key is user-scoped. The old key
    // `blanked_tutorial_seen` was device-global, so when user A
    // dismissed the tutorial on this iPhone and user B later signed
    // in with a different account, B inherited A's "seen" flag and
    // never saw the tour. Binding the key to user.id means each
    // account keeps its own local state, matching the server
    // `profiles.tutorial_seen` flag which is already per-user.
    (async () => {
      if (!user?.id) return;
      const key = `blanked_tutorial_seen_${user.id}`;
      let seen: string | null = null;
      try {
        seen = await AsyncStorage.getItem(key);
      } catch {}
      if (!seen) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('tutorial_seen')
            .eq('id', user.id)
            .single();
          if (data?.tutorial_seen) {
            seen = '1';
            // Mirror locally so we skip the network call next launch
            try { await AsyncStorage.setItem(key, '1'); } catch {}
          }
        } catch {}
      }
      if (cancelled) return;
      if (!seen) {
        // Defer the tour until the post-signup paywall flow has run
        // its course. New users came here from the blurred-profile
        // CTA, which means a paywall is queued; firing the spotlight
        // overlay 800ms after auth would land it on top of the
        // SubscriptionPaywall ("1 OF 5 - Start here" floating over
        // the Subscribe button). The post-signup flag re-enables this
        // gate via setPostSignupPaywallDone(true) on every exit path.
        if (!postSignupPaywallDone) return;
        setTimeout(() => { if (!cancelled) setShowTutorial(true); }, 800);
        return;
      }
      // Wait for cloud sync to merge the latest loginReward from
      // Supabase before deciding whether to show the modal. On iOS
      // native `localStorage` doesn't exist so loadState() returns an
      // empty snapshot — the `lastClaimDate` starts as '' and looks
      // like "never claimed" until the Supabase round-trip completes.
      // Bumped 1200ms → 2500ms because on slower networks the merge
      // was landing AFTER the old window, causing the modal to pop
      // for users who'd already claimed today. The component itself
      // ALSO re-checks on open and auto-dismisses if the reward is
      // unavailable — belt-and-braces against a stuck modal.
      setTimeout(() => {
        if (cancelled) return;
        const latest = useGameStore.getState().loginReward;
        const check = checkDailyReward(latest);
        if (check.available) setShowDailyReward(true);
      }, 2500);
    })();
    return () => { cancelled = true; };
    // postSignupPaywallDone is a dependency because the effect's
    // tutorial branch reads it and bails when paywalls are still up.
    // Re-running once the flag flips lets the tour show after the
    // user dismisses / subscribes.
  }, [user?.id, postSignupPaywallDone]);

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
    // Local cache — user-scoped so a different account on this
    // device starts with a clean slate. Matches the key used in the
    // seen-check effect above.
    if (user?.id) {
      try { await AsyncStorage.setItem(`blanked_tutorial_seen_${user.id}`, 'true'); } catch {}
      // Server flag so a fresh install on a new device also skips it
      supabase.from('profiles').update({ tutorial_seen: true }).eq('id', user.id).then(() => {});
    }
  }, [user?.id]);

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            ref={livesRef}
            collapsable={false}
            onPress={() => setInfoCard(infoCard === 'lives' ? null : 'lives')}
            style={[styles.livesPill, { backgroundColor: colors.wrongSoft }]}
            accessibilityRole="button"
            accessibilityLabel={t('home.lives_aria', { count: lives })}
            accessibilityHint={t('home.lives_hint')}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name={i < lives ? 'heart' : 'heart-outline'} size={15} color={i < lives ? colors.wrong : colors.textLight} />
            ))}
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable
              ref={gemsRef}
              collapsable={false}
              onPress={() => setInfoCard(infoCard === 'gems' ? null : 'gems')}
              style={[styles.gemPill, { backgroundColor: colors.accentSoft }]}
              accessibilityRole="button"
              accessibilityLabel={t('home.gems_aria', { count: gems })}
              accessibilityHint={t('home.gems_hint')}
            >
              <Ionicons name="diamond" size={13} color={colors.accent} />
              <AnimatedGemCount count={gems} style={[styles.gemCount, { color: colors.accent }]} />
            </Pressable>
            <Pressable
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('home.open_profile_aria')}
            >
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileImage} />
              ) : (
                <Blink expression={getExpressionById(equippedExpression)?.blinkExpression ?? 'normal'} size={32} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero card — purple gradient */}
        <View ref={heroRef} collapsable={false} style={styles.heroCardOuter}>
          <LinearGradient colors={['#6C5CE7', '#5B4CC8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          {/* Logo row */}
          <View style={styles.heroLogoRow}>
            <View style={{ marginLeft: 2 }}>
              <Text style={styles.heroLogoText}>Blank<Text style={{ fontWeight: '800' }}>ed</Text></Text>
              <Text style={styles.heroLogoSub}>{getHomeGreeting(streakCount)}</Text>
            </View>
          </View>

          {/* Level info — uses the unified journey position (1-380)
           *  rather than the legacy "World X Level Y" format so the
           *  text matches the new one-path progression. */}
          <Text style={styles.heroContinueLabel}>{t('home.continue_label')}</Text>
          <Text style={styles.heroLevelTitle}>{t('home.unified_level_title', { position: unifiedPosition, total: 380 })}</Text>
          <Text style={styles.heroLevelSubtitle}>{heroSubtitle}</Text>

          {/* Progress bar — fills by unified position instead of the
           *  per-world count, so progress actually reflects the whole
           *  journey not just the current world's slice. */}
          <View style={styles.heroProgressRow}>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${Math.round((unifiedPosition / 380) * 100)}%` }]} />
            </View>
            <Text style={styles.heroProgressText}>{unifiedPosition}/380</Text>
          </View>

          {/* Play button with press animation. Routes to the level at
           *  the player's current UNIFIED position — so "Play Level 247"
           *  actually launches level 247 in the ladder, not whatever
           *  getNextUnplayedLevelId returned (which only knows about
           *  Classic and could mismatch the hero copy). */}
          <Pressable
            style={({ pressed }) => [styles.heroPlayButton, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
            onPress={() => {
              useGameStore.getState().checkLifeRegen();
              if (useGameStore.getState().lives <= 0) { setShowOutOfLives(true); return; }
              const current = getUnifiedLevel(unifiedPosition);
              if (!current) {
                // Ladder exhausted or bad state — fall back to Classic next unplayed.
                router.push(`/game/${nextLevelId}`);
                return;
              }
              useGameStore.getState().setLastPlayed(current.mode, current.levelId);
              if (current.mode === 'classic') {
                router.push(`/game/${current.levelId}`);
                return;
              }
              const match = current.levelId.match(/^[a-z]+_w(\d+)_l(\d+)$/);
              const worldNumber = match?.[1] ?? '1';
              const levelNumber = match?.[2] ?? '1';
              const campaign = CAMPAIGNS[current.mode];
              const worldName = campaign?.worldNames[Number(worldNumber) - 1] ?? '';
              router.push({
                pathname: '/game/side-campaign',
                params: {
                  levelId: current.levelId,
                  mode: current.mode,
                  worldNumber,
                  levelNumber,
                  worldName,
                },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={t('home.play_aria_unified', { position: unifiedPosition })}
          >
            <Text style={styles.heroPlayText}>{t('home.play_button')}</Text>
          </Pressable>
        </LinearGradient>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.accentSoft }]}>
              <Svg width={16} height={12} viewBox="0 0 36 24"><Path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="none" stroke={colors.accent} strokeWidth={1.8} /><Circle cx={18} cy={12} r={4} fill={colors.accent} /><Circle cx={18} cy={12} r={2} fill="white" /></Svg>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('home.stat_brain')}</Text>
            <Text style={[styles.statValue, { color: completedCount > 0 ? colors.accent : colors.textLight }]}>
              {completedCount > 0 ? `${memoryScore}%` : EMDASH}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.goldSoft }]}>
              <StarIcon size={13} color={colors.gold} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('home.stat_stars')}</Text>
            <Text style={[styles.statValue, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/600</Text>
          </View>
          <Pressable
            onPress={() => {
              // While the recovery window is active, the streak card acts
              // as a shortcut back to the modal rather than to rewards.
              if (inRecoveryWindow && streakCount >= 3) {
                setRecoveryModal({ streak: streakCount, daysMissed: recoveryDaysMissed });
                return;
              }
              router.push('/streak-rewards');
            }}
            style={[
              styles.statCard,
              { backgroundColor: colors.card },
              inRecoveryWindow && { borderWidth: 1.5, borderColor: colors.wrong + '40' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={inRecoveryWindow ? t('home.streak_danger_aria', { mins: recoveryMinsRemaining ?? 0 }) : t('home.streak_normal_aria', { count: streakCount })}
          >
            <View style={[styles.statIconBg, { backgroundColor: colors.wrongSoft }]}>
              <Text style={{ fontSize: 12 }}>{'\u{1F525}'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('home.stat_streak')}</Text>
            <Text style={[styles.statValue, { color: streakCount > 0 ? colors.wrong : colors.textLight }]}>{streakCount}</Text>
            {inRecoveryWindow && (
              // Recovery countdown stays — it's a critical safety
              // prompt. The next-milestone preview ("Day 150: 50 +3")
              // was removed because it crowded the stat card and
              // duplicated info the dedicated streak-rewards screen
              // already presents better.
              <Text
                style={[
                  styles.streakReward,
                  { color: (recoveryMinsRemaining ?? 0) < 5 ? colors.wrong : colors.accent },
                ]}
                numberOfLines={1}
              >
                {(recoveryMinsRemaining ?? 0) < 5
                  ? t('home.streak_recover_warn', { mins: recoveryMinsRemaining ?? 0 })
                  : t('home.streak_recover_time', { mins: recoveryMinsRemaining ?? 0 })}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Daily Challenge — sits between the stat row and Weekly
            Challenges per spec 1.1. Self-fetches today's status; the
            DailyChallengeCard component handles all three states
            (not played / played / streak alert). */}
        <View style={{ marginTop: 12 }}>
          <DailyChallengeCard />
        </View>

        {/* Weekly Challenges */}
        <WeeklyChallengesCard />

        {/* Recent Activity */}
        <RecentActivityCard colors={colors} router={router} />

      </ScrollView>

      {/* Tutorial overlay for first-time users */}
      {/* Daily login reward popup */}
      <DailyLoginReward visible={showDailyReward} onDismiss={() => setShowDailyReward(false)} />

      {/* First-run pre-permission popup. Warms the player up to the
          native "Allow Notifications?" sheet with a one-off explainer
          so we don't burn the single system prompt they get. Server-
          side has_seen_notif_prompt stops this re-showing across
          devices for the same account. */}
      <NotificationPrompt
        visible={showNotifPrompt}
        onEnable={async () => {
          setShowNotifPrompt(false);
          await markNotifPromptAsked(user?.id);
          const granted = await requestNotificationPermission();
          if (granted && user?.id) {
            await registerPushToken(user.id);
          }
        }}
        onDismiss={async () => {
          setShowNotifPrompt(false);
          try {
            const cur = parseInt((await AsyncStorage.getItem('blanked_notifications_declined_count')) ?? '0', 10);
            await AsyncStorage.setItem('blanked_notifications_declined_count', String(cur + 1));
            // After the second decline, stop asking across the app.
            if (cur + 1 >= 2) await markNotifPromptAsked(user?.id);
          } catch {}
        }}
      />

      {/* Tutorial overlay for first-time users */}
      <OutOfLivesModal
        visible={showOutOfLives}
        onClose={() => setShowOutOfLives(false)}
        onGoToShop={() => { setShowOutOfLives(false); router.push('/(tabs)/shop'); }}
        onGoToBlankedPlus={() => { setShowOutOfLives(false); setShowPaywall(true); }}
      />
      <SubscriptionPaywall
        visible={showPaywall}
        onDismiss={async () => {
          setShowPaywall(false);
          // Post-signup flow chains to the discount paywall once per
          // device. Other entry points (out-of-lives, stats space)
          // just close.
          if (!postSignupPaywallActive.current) {
            // Non-post-signup paywall closing has no effect on the
            // tutorial gate. Existing users never set the flag in the
            // first place; setting it again is a harmless no-op.
            setPostSignupPaywallDone(true);
            return;
          }
          postSignupPaywallActive.current = false;
          let alreadySeen = false;
          try {
            alreadySeen = (await AsyncStorage.getItem('blanked_discount_paywall_seen')) === 'true';
          } catch {}
          if (alreadySeen) {
            // No discount paywall to chain to. Paywall flow ends here,
            // unblock the tutorial.
            setPostSignupPaywallDone(true);
            return;
          }
          try { await AsyncStorage.setItem('blanked_discount_paywall_seen', 'true'); } catch {}
          // Defer briefly so the regular paywall's dismiss animation
          // completes before the discount paywall slides in. Tutorial
          // stays gated until that paywall closes too.
          setTimeout(() => setShowDiscountPaywall(true), 280);
        }}
        onSubscribe={async (plan: 'monthly' | 'yearly') => {
          setShowPaywall(false);
          postSignupPaywallActive.current = false;
          // Route through the real StoreKit purchase so the home-tab
          // entry path matches shop.tsx / stats-space.tsx.
          const { result, periodType } = await purchaseSubscription(plan);
          // Either way the paywall is closed: success unlocks Plus,
          // cancel/error returns to home. Either way the tutorial
          // should be allowed to fire afterwards.
          setPostSignupPaywallDone(true);
          if (result !== 'success') return;
          const store = useGameStore.getState();
          store.activatePlus(periodType);
          store.unlockCosmetic('frame_premium_gold');
          store.unlockCosmetic('expr_premium');
          store.unlockCosmetic('banner_premium_gold');
          // Store-level guard skips during trial / intro period, so
          // calling unconditionally is safe.
          store.maybeGrantMonthlyPlusGems();
          setShowPremiumCelebration(true);
        }}
      />
      <DiscountPaywall
        visible={showDiscountPaywall}
        onDismiss={() => { setShowDiscountPaywall(false); setPostSignupPaywallDone(true); }}
        onSubscribe={async () => {
          setShowDiscountPaywall(false);
          // Discount offer only ever applies to the monthly plan.
          // RevenueCat applies the configured intro offer at purchase
          // time when the Apple ID is eligible.
          const { result, periodType } = await purchaseSubscription('monthly');
          // Paywall flow ends here regardless of purchase outcome.
          // Releases the tutorial gate so the spotlight tour fires
          // next render cycle.
          setPostSignupPaywallDone(true);
          if (result !== 'success') return;
          const store = useGameStore.getState();
          store.activatePlus(periodType);
          store.unlockCosmetic('frame_premium_gold');
          store.unlockCosmetic('expr_premium');
          store.unlockCosmetic('banner_premium_gold');
          store.maybeGrantMonthlyPlusGems();
          setShowPremiumCelebration(true);
        }}
      />
      <TutorialOverlay visible={showTutorial && tutorialSpots.length === 5} spotlights={tutorialSpots} onComplete={completeTutorial} />
      <PremiumCelebration visible={showPremiumCelebration} onDismiss={() => setShowPremiumCelebration(false)} />

      {/* Info Cards */}
      <InfoCard
        visible={infoCard === 'lives'}
        icon={<Ionicons name="heart" size={20} color="#FF6B6B" />}
        title={t('home.info.lives_title')}
        description={lives >= 5
          ? t('home.info.lives_full')
          : (lives === 1
              ? t('home.info.lives_partial_one')
              : t('home.info.lives_partial_many', { count: lives }))}
        tip={lives < 5 ? t('home.info.lives_tip') : undefined}
        accentColor="#FF6B6B"
        action={lives < 5 ? () => setShowPaywall(true) : undefined}
        actionLabel={lives < 5 ? t('home.info.lives_action') : undefined}
        onClose={() => setInfoCard(null)}
      />
      <InfoCard
        visible={infoCard === 'gems'}
        icon={<Ionicons name="diamond" size={20} color="#6C5CE7" />}
        title={t('home.info.gems_title')}
        description={t('home.info.gems_desc', { count: gems })}
        tip={t('home.info.gems_tip')}
        accentColor="#6C5CE7"
        onClose={() => setInfoCard(null)}
      />
      <InfoCard
        visible={infoCard === 'streak'}
        icon={<Text style={{ fontSize: 20 }}>{'\u{1F525}'}</Text>}
        title={t('home.info.streak_title')}
        description={streakCount === 0 ? t('home.info.streak_zero') : t('home.info.streak_alive', { count: streakCount })}
        tip={streakCount > 0 ? t('home.info.streak_tip') : undefined}
        accentColor="#FF6B6B"
        onClose={() => setInfoCard(null)}
      />

      {/* Streak recovery modal — shown after app-open check detects missed days */}
      {recoveryModal && (
        <StreakRecoveryModal
          visible
          streak={recoveryModal.streak}
          daysMissed={recoveryModal.daysMissed}
          onDismiss={() => setRecoveryModal(null)}
        />
      )}

      {/* Shield auto-use toast (also covers generic shield actions) */}
      {toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toastCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.title}</Text>
          </View>
        </View>
      )}
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
  // Teaser line under the streak number — coral, tiny, just a hint
  streakReward: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  // Transient success toast (shield auto-used, etc.)
  toastWrap: { position: 'absolute', top: 60, left: 16, right: 16, alignItems: 'center', zIndex: 9998 },
  toastCard: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  toastText: { fontSize: 13, fontWeight: '700' },

  // Journey

});
