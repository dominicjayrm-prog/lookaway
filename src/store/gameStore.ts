import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Level, GameState } from '@/src/types/game';
import { GEM_REWARDS, calculateReplayReward, checkStreakMilestone, INITIAL_GEMS, LIVES_CONFIG, POWER_UP_COSTS, bundlePrice, applyPlusGemMultiplier, type PowerUpId } from '@/src/utils/scoring';
import type { PeriodType } from '@/src/lib/purchases';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import { saveProgressToSupabase, loadProgressFromSupabase } from '@/src/utils/progressSync';
import { INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { resetAllStreakRewards, type ClaimedMilestone as ImportedClaimedMilestone } from '@/src/utils/streakRewards';
import { shouldShowReviewPrompt, type ReviewPromptState } from '@/src/lib/reviewPrompt';
import { track, EVENTS } from '@/src/lib/analytics';
import { logLevelAchieved } from '@/src/lib/metaEvents';
import { applyLanguage, type LanguagePreference } from '@/src/i18n';
import {
  UNIFIED_LADDER,
  getPositionForLevelId,
  getWorldForPosition,
  TOTAL_POSITIONS,
  type ModeId,
  type WorldTheme,
} from '@/src/data/unifiedJourney';

/**
 * Every AsyncStorage key that belongs to ONE user and must be wiped
 * when a different user signs in on the same device. Device-level
 * prefs (theme, sound, haptics, device user-id, level cache) are
 * intentionally excluded — those are per-device, not per-account.
 */
const USER_SCOPED_STORAGE_KEYS = [
  'blanked-progress',
  'blanked_activity',
  'blanked_weekly_challenges_v2',
  'blanked_event_progress',
  'blanked_tutorial_seen',
  'blanked_referred_by_code',
  'blanked_referral_processed',
  'blanked_referral_code',
  'blanked_notifications_asked',
  'blanked_notifications_declined_count',
  'starter_pack_purchased',
  'starter_pack_offered_at',
  'mastermind_intro_seen',
  // Legacy global profile-pic cache key — the new avatar cache
  // lives under `blanked-profile-pic::<userId>` which is already
  // account-isolated, but this old key caused the "test account
  // shows main account's selfie" bug. Purge on every account
  // switch so pre-fix installs clean up themselves.
  'blanked-profile-pic',
];

/** In-memory fallback for platforms where localStorage is unavailable */
let _memoryUserId: string | null = null;

/** Get current user ID for economy logging */
function getUserId(): string {
  try {
    // Intentional: sync access to cached session (not part of public SDK API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (supabase as unknown as { auth?: { session?: () => { user?: { id?: string } } | null } }).auth?.session?.();
    if (session?.user?.id) return session.user.id;
  } catch {}
  // Fallback: try localStorage (works on web, may throw on native iOS)
  try {
    const stored = localStorage.getItem('blanked-user-id');
    if (stored) return stored;
    const id = `anon-${Date.now()}`;
    localStorage.setItem('blanked-user-id', id);
    return id;
  } catch (e) {
    log.warn('storage', 'localStorage unavailable, using in-memory fallback', { error: String(e) });
  }
  // Final fallback: in-memory ID for native platforms
  if (!_memoryUserId) {
    _memoryUserId = `anon-${Date.now()}`;
  }
  return _memoryUserId;
}

interface Answer { questionId: string; selectedIndex: number | null; correctIndex: number; isCorrect: boolean; }
function buildLevelIds(): string[] {
  const counts = [20, 30, 35, 35, 40, 40];
  const ids: string[] = [];
  for (let w = 0; w < counts.length; w++) {
    for (let l = 1; l <= counts[w]; l++) ids.push(`w${w + 1}-l${l}`);
  }
  return ids;
}

export interface PowerUpInventory {
  // Universal
  extra_life: number;
  // Classic
  slowTime: number;
  peek: number;
  fiftyFifty: number;
  skip: number;
  // Speed Recall
  sr_slow_time: number;
  sr_ghost_outline: number;
  sr_second_chance: number;
  // Snap Match
  sm_slow_flash: number;
  sm_highlight: number;
  sm_freeze: number;
  // Sequence
  seq_replay_one: number;
  seq_safety_net: number;
  // Counting Blitz
  cb_slow_motion: number;
  cb_colour_filter: number;
  // Colour Chain
  cc_slow_time: number;
  cc_reveal_one: number;
}

/**
 * Cosmetics that are only granted to Blanked+ subscribers. Ownership of any
 * one of these is the current signal for active subscription (pre-RevenueCat).
 * Once RevenueCat is wired up, `isSubscribed()` in the store should read the
 * entitlement directly instead.
 */
export const SUBSCRIBER_COSMETIC_IDS = [
  'frame_prismatic', 'frame_diamond', 'frame_premium_gold',
  'banner_aurora', 'banner_holographic', 'banner_premium_gold',
  'expr_premium',
  'name_purple', 'name_gold', 'name_coral', 'name_ocean', 'name_mint',
];

/**
 * Authoritative subscription status. The local value is mirrored on the
 * `subscription_status` column in the `profiles` table and cloud is the
 * source of truth during `loadFromCloud` — that's how cancellations
 * propagate between devices.
 */
export type SubscriptionStatus = 'active' | 'inactive';

const DEFAULT_POWERUPS: PowerUpInventory = {
  extra_life: 0,
  slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0,
  sr_slow_time: 0, sr_ghost_outline: 0, sr_second_chance: 0,
  sm_slow_flash: 0, sm_highlight: 0, sm_freeze: 0,
  seq_replay_one: 0, seq_safety_net: 0,
  cb_slow_motion: 0, cb_colour_filter: 0,
  cc_slow_time: 0, cc_reveal_one: 0,
};

// One-time migration: move w1-lX progress to w2-lX (world restructure)
function migrateWorldProgress() {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    if (localStorage.getItem('blanked_world_migrated')) return;

    const saved = localStorage.getItem('blanked-progress');
    if (!saved) { localStorage.setItem('blanked_world_migrated', 'true'); return; }

    const data = JSON.parse(saved);
    if (!data.levelProgress) { localStorage.setItem('blanked_world_migrated', 'true'); return; }

    const newProgress: Record<string, unknown> = {};
    let changed = false;

    for (const [key, value] of Object.entries(data.levelProgress)) {
      if (key.startsWith('w1-l')) {
        newProgress[key.replace('w1-l', 'w2-l')] = value;
        changed = true;
      } else {
        newProgress[key] = value;
      }
    }

    if (changed) {
      data.levelProgress = newProgress;
      localStorage.setItem('blanked-progress', JSON.stringify(data));
    }
    localStorage.setItem('blanked_world_migrated', 'true');
  } catch (e) {
    log.error('migration', 'World migration failed', e);
  }
}

// Manual localStorage persistence
interface SavedState {
  gems?: number;
  lives?: number;
  maxLives?: number;
  livesLastLostAt?: number | null;
  adsRemoved?: boolean;
  unlimitedLivesUntil?: number | null;
  streakCount?: number;
  bestStreak?: number;
  daysPlayed?: number;
  streakShields?: number;
  recoveryWindowStart?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  /** Last time saveState fired locally, in ms since epoch. Compared
   *  against the cloud's `updated_at` during loadFromCloud so we can
   *  prefer whichever side is actually newer for scalar fields. */
  localUpdatedAt?: number;
  streakMilestonesClaimed?: number[];
  lastPlayDate?: string | null;
  /** UTC YYYY-MM-DD of the last day the user submitted a Daily
   *  Challenge result. Persisted locally so the home card can keep
   *  showing the "done" state even when the Supabase row check is
   *  briefly unavailable (transient session refresh, network blip).
   *  Cleared automatically when a new UTC day starts. */
  lastDailyPlayedDate?: string | null;
  /** ISO timestamp of the last time the user was credited their monthly
   *  100 Blanked+ gems. null = never granted. Synced via profiles so
   *  the 30-day cooldown is honoured across devices. */
  lastPlusGemGrantAt?: string | null;
  /** ISO timestamp of the last time our Stage A "Rate BLANKED" modal
   *  was shown. Drives the 60-day cooldown between prompts. */
  lastReviewPromptedAt?: string | null;
  /** Outcome of the last Stage A prompt. 'accepted' means we escalated
   *  to the native Apple sheet — once accepted, never re-prompt (Apple
   *  rate-limits the native sheet to 3/year anyway). */
  reviewPromptOutcome?: 'accepted' | 'dismissed' | null;
  /** User's language choice. 'system' follows the device locale;
   *  'en'/'es' pin explicitly. Synced via profiles so it follows
   *  the user across devices. */
  preferredLanguage?: LanguagePreference;
  totalStars?: number;
  highestWorld?: number;
  powerUps?: Partial<PowerUpInventory>;
  levelProgress?: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores?: number[];
  ownedCosmetics?: string[];
  equippedFrame?: string;
  equippedBanner?: string;
  equippedNameColor?: string;
  equippedExpression?: string;
  loginReward?: LoginRewardState;
  // Unified Brain Journey — one linear ladder of 400 levels (380 main +
  // 20 endgame) that snakes through five themed worlds plus the Endgame
  // 20 trial. `unifiedPosition` is the highest position the player has
  // unlocked (they're currently playing this number).
  unifiedPosition?: number;
  currentWorldTheme?: WorldTheme;
  lastPlayedMode?: ModeId | null;
  lastPlayedLevelId?: string | null;
  hasSeenUnifiedIntro?: boolean;
  hasSeenWorldIntro?: Partial<Record<WorldTheme, boolean>>;
  hasSeenBrainMaster?: boolean;
  // Endgame 20 (positions 381-400) completion celebration. Mirrors
  // hasSeenBrainMaster but fires at position 400 (after the Grand
  // Master Trial). Distinct flag so existing 380-completers don't
  // accidentally suppress the new milestone.
  hasSeenGrandMaster?: boolean;
}

// One-time migration: lift legacy `blanked_login_rewards` key into the main
// progress blob so daily login streaks start syncing across devices.
function migrateLoginReward(saved: SavedState): SavedState {
  if (saved.loginReward) return saved;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return saved;
    const legacy = localStorage.getItem('blanked_login_rewards');
    if (!legacy) return saved;
    const parsed = JSON.parse(legacy) as LoginRewardState;
    if (parsed && typeof parsed.currentDay === 'number' && typeof parsed.lastClaimDate === 'string') {
      saved.loginReward = {
        currentDay: parsed.currentDay ?? 0,
        lastClaimDate: parsed.lastClaimDate ?? '',
        streak: parsed.streak ?? 0,
      };
      localStorage.removeItem('blanked_login_rewards');
    }
  } catch {}
  return saved;
}

/**
 * First-run migration for the Unified Brain Journey. Existing users with
 * progress in `levelProgress` land on the first uncompleted position in
 * the ladder — preserving their sense of "where they are" across the
 * rollout. New users start at position 1.
 *
 * Runs once, detected by `unifiedPosition === undefined`. After migration
 * the field is set and this is a no-op on subsequent loads.
 */
function migrateUnifiedJourney(saved: SavedState): SavedState {
  if (saved.unifiedPosition !== undefined) return saved;
  const progress = saved.levelProgress ?? {};
  let firstUncompleted = 1;
  for (const level of UNIFIED_LADDER) {
    const entry = progress[level.levelId];
    if (!entry || entry.stars <= 0) {
      firstUncompleted = level.position;
      break;
    }
    firstUncompleted = level.position + 1;
  }
  const position = Math.min(TOTAL_POSITIONS, Math.max(1, firstUncompleted));
  saved.unifiedPosition = position;
  saved.currentWorldTheme = getWorldForPosition(position);
  saved.hasSeenUnifiedIntro = saved.hasSeenUnifiedIntro ?? false;
  saved.hasSeenWorldIntro = saved.hasSeenWorldIntro ?? {};
  saved.hasSeenBrainMaster = saved.hasSeenBrainMaster ?? false;
  saved.hasSeenGrandMaster = saved.hasSeenGrandMaster ?? false;
  saved.lastPlayedMode = saved.lastPlayedMode ?? null;
  saved.lastPlayedLevelId = saved.lastPlayedLevelId ?? null;
  return saved;
}

function loadState(): SavedState {
  try {
    if (typeof window === 'undefined') return migrateUnifiedJourney(migrateLoginReward({}));
    const saved = localStorage.getItem('blanked-progress');
    const parsed = saved ? (JSON.parse(saved) as SavedState) : {};
    return migrateUnifiedJourney(migrateLoginReward(parsed));
  } catch { return migrateUnifiedJourney(migrateLoginReward({})); }
}

function saveState(state: GameStore) {
  const stampedAt = Date.now();
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('blanked-progress', JSON.stringify({
      gems: state.gems, lives: state.lives, maxLives: state.maxLives, livesLastLostAt: state.livesLastLostAt,
      adsRemoved: state.adsRemoved, unlimitedLivesUntil: state.unlimitedLivesUntil,
      streakCount: state.streakCount, bestStreak: state.bestStreak, daysPlayed: state.daysPlayed,
      streakShields: state.streakShields,
      username: state.username, avatarUrl: state.avatarUrl,
      subscriptionStatus: state.subscriptionStatus,
      streakMilestonesClaimed: state.streakMilestonesClaimed, lastPlayDate: state.lastPlayDate,
      lastDailyPlayedDate: state.lastDailyPlayedDate,
      lastPlusGemGrantAt: state.lastPlusGemGrantAt,
      lastReviewPromptedAt: state.lastReviewPromptedAt,
      reviewPromptOutcome: state.reviewPromptOutcome,
      preferredLanguage: state.preferredLanguage,
      totalStars: state.totalStars, highestWorld: state.highestWorld,
      levelProgress: state.levelProgress, completedScores: state.completedScores,
      powerUps: state.powerUps,
      ownedCosmetics: state.ownedCosmetics, equippedFrame: state.equippedFrame,
      equippedBanner: state.equippedBanner, equippedNameColor: state.equippedNameColor, equippedExpression: state.equippedExpression,
      loginReward: state.loginReward,
      unifiedPosition: state.unifiedPosition,
      currentWorldTheme: state.currentWorldTheme,
      lastPlayedMode: state.lastPlayedMode,
      lastPlayedLevelId: state.lastPlayedLevelId,
      hasSeenUnifiedIntro: state.hasSeenUnifiedIntro,
      hasSeenWorldIntro: state.hasSeenWorldIntro,
      hasSeenBrainMaster: state.hasSeenBrainMaster,
      hasSeenGrandMaster: state.hasSeenGrandMaster,
      localUpdatedAt: stampedAt,
      // Stamp the authUserId this blob belongs to. On cold start
      // CloudSyncLoader compares this against the incoming auth
      // session and wipes local state if they don't match — stops a
      // new user from inheriting the previous user's blob.
      _authUserId: state._authUserId,
    }));
  } catch (e) {
    log.error('storage', 'saveState failed', e);
  }

  // Also sync to Supabase (debounced, fire and forget). The timer
  // reads the CURRENT auth + state via `useGameStore.getState()`
  // inside the callback — reading from the closure-captured `state`
  // was unsafe across logout/login transitions and could push a
  // stale snapshot for a user who'd already signed out.
  clearTimeout((saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer);
  (saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer = setTimeout(() => {
    const live = useGameStore.getState();
    const uid = live._authUserId;
    if (!uid) return;
    // CRITICAL: never sync to cloud before loadFromCloud has
    // completed. The store's default state (gems:50, subscription:
    // inactive, cosmetics:[]) would otherwise overwrite the user's
    // real cloud row during the boot race on slow networks. Log a
    // breadcrumb so we can spot if this skip fires frequently in
    // production analytics.
    if (!live._cloudHydrated) {
      log.breadcrumb('sync', 'skipped cloud save — not hydrated yet', { uid });
      return;
    }
    saveProgressToSupabase(uid, live).catch((e) => log.error('sync', 'debounced sync failed', e, { uid }));
  }, 2000);
}

// Flush pending cloud sync on page unload (web)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('beforeunload', () => {
    const timer = (saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer;
    if (timer) {
      clearTimeout(timer);
      const state = useGameStore?.getState?.();
      if (state?._authUserId && state._cloudHydrated) {
        saveProgressToSupabase(state._authUserId, state).catch(() => {});
      }
    }
  });
}

export interface GameStore {
  _authUserId: string | null; // Real Supabase auth user ID, set by CloudSyncLoader
  gems: number; lives: number; maxLives: number; livesLastLostAt: number | null;
  /** True after the user buys the "Remove Ads" non-consumable IAP.
   *  Checked by the ad service before showing interstitials / banners.
   *  Synced to Supabase via the profiles column. */
  adsRemoved: boolean;
  /** Epoch ms when the "Unlimited Lives 1 Hour" boost expires.
   *  While Date.now() < this value, loseLife() is a no-op and the
   *  lives display shows ∞. 0 or null means inactive. */
  unlimitedLivesUntil: number | null;
  streakCount: number; bestStreak: number; daysPlayed: number;
  /** Streak shield count — earned from milestones (7d, 21d, 30d…), consumed
   *  automatically on app-open when a 1-day miss is detected. Server source
   *  of truth is `profiles.streak_shields`. */
  streakShields: number;
  /** When the recovery window was first detected (1-hour timer). Null when
   *  no recovery is pending. ISO string to match Supabase. */
  recoveryWindowStart: string | null;
  username: string | null;
  avatarUrl: string | null;
  subscriptionStatus: SubscriptionStatus;
  /** Period type of the active Blanked+ entitlement, refreshed from
   *  RevenueCat on launch / foreground / purchase / restore. Used by
   *  `maybeGrantMonthlyPlusGems` to skip the monthly gem credit while
   *  the user is in a free-trial or discounted intro period — they
   *  haven't paid yet, so granting gems would let someone trial-and-
   *  cancel for free gems. Reset to 'unknown' when the subscription
   *  goes inactive. NOT persisted to Supabase — always re-derived from
   *  StoreKit / RevenueCat at runtime. */
  subscriptionPeriodType: PeriodType;
  /** Last time `saveState` ran in ms since epoch. Compared against the
   *  cloud's `updated_at` in loadFromCloud to decide which side wins
   *  for scalar fields (gems, equipped_*, etc). Not persisted to
   *  Supabase — Postgres maintains its own `updated_at` via trigger. */
  localUpdatedAt: number;
  streakMilestonesClaimed: number[]; lastPlayDate: string | null;
  lastDailyPlayedDate: string | null;
  setLastDailyPlayedDate: (iso: string | null) => void;
  /** ISO timestamp of the most recent 300-gem Blanked+ grant. Null
   *  = never granted. 30 days must elapse before the next grant. */
  lastPlusGemGrantAt: string | null;
  /** ISO timestamp of the last Stage A review prompt — drives the
   *  60-day cooldown. Synced across devices via profiles. */
  lastReviewPromptedAt: string | null;
  /** 'accepted' = user tapped Sure and we fired the native Apple sheet
   *  (never re-prompt). 'dismissed' = tapped Maybe later (prompt again
   *  after cooldown). null = never prompted yet. */
  reviewPromptOutcome: 'accepted' | 'dismissed' | null;
  /** Which trigger opened the currently-visible (or last-visible)
   *  Stage A modal. Read by the modal when the user responds so
   *  ACCEPTED / DISMISSED analytics carry the same trigger prop as
   *  the SHOWN event — lets us build a per-trigger funnel. Ephemeral,
   *  NOT persisted. */
  reviewPromptTrigger: 'level_3_star' | 'friend_win' | null;
  /** Ephemeral — true while the Stage A modal is mounted. NOT persisted.
   *  Flipped to true by `maybeShowReviewPrompt`, back to false by the
   *  modal's close animation. */
  reviewPromptVisible: boolean;
  /** 'system' = follow device locale; 'en'/'es' = explicit pin.
   *  Default 'system'. Persisted locally + synced via profiles. */
  preferredLanguage: LanguagePreference;
  totalStars: number; highestWorld: number;
  // Unified Brain Journey: the single linear ladder players walk.
  /** Highest position (1-400) the player has reached. They are currently
   *  playing this level; completing it calls `advanceUnifiedPosition`. */
  unifiedPosition: number;
  /** Derived from `unifiedPosition`. Cached so render code doesn't have to
   *  recompute on every frame. */
  currentWorldTheme: WorldTheme;
  /** Most recent mode + level the player actually opened — either via the
   *  unified path or via the Mode Library. Used by the Journey "Continue"
   *  hero card to say "Level 28 · Snap Match" instead of a generic CTA. */
  lastPlayedMode: ModeId | null;
  lastPlayedLevelId: string | null;
  /** True once the first-time intro sequence has been dismissed. New users
   *  see three swipe cards explaining the journey; existing users see a
   *  migration banner that dismisses to true the same way. */
  hasSeenUnifiedIntro: boolean;
  /** Per-world flag for the one-time "Welcome to X" celebration shown on
   *  entry to a new themed world. */
  hasSeenWorldIntro: Partial<Record<WorldTheme, boolean>>;
  /** Sticky one-shot for the Level 380 Brain Master celebration so it
   *  doesn't re-fire every time the journey screen mounts after the
   *  player has already seen it. */
  hasSeenBrainMaster: boolean;
  /** Sticky one-shot for the position 400 Grand Master celebration —
   *  fires when the player clears the Endgame 20 (positions 381-400)
   *  including the Mastermind L55 Grand Master Trial. Independent
   *  from hasSeenBrainMaster so existing 380-completers see the new
   *  milestone fire correctly when they push past 380. */
  hasSeenGrandMaster: boolean;
  powerUps: PowerUpInventory;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
  currentLevel: Level | null; gameState: GameState; currentSceneIndex: number; currentQuestionIndex: number;
  answers: Answer[]; selectedOption: number | null; revealedCorrect: number | null; score: number;
  // ── Transient gameplay counters used by the weekly challenge system ──
  /** Power-ups used DURING the current level. Reset in `startLevel`,
   *  bumped by `usePowerUp`. Read by result.tsx when recording a level
   *  completion so challenges like flawless_3 / no_powerups_10 can
   *  distinguish "used zero" from "used at least one". */
  levelPowerUpsUsed: number;
  /** Timestamp (ms) the current question was presented. Set whenever we
   *  transition to QUESTION state. Used to compute response time on
   *  `revealAnswer` for the speed_accuracy_10 weekly challenge. */
  currentQuestionStartedAt: number;
  /** How many levels the player has completed this session. Reset when
   *  the app is backgrounded for > SESSION_RESET_MS or when the user
   *  manually closes the app. Read by the weekly tracker for
   *  endurance_8. */
  sessionLevelCount: number;
  /** Wall-clock of the last time the session counter was touched; used
   *  to decide whether to reset it on app foreground. */
  sessionLastTouchedAt: number;
  _hydrated: boolean;
  /** True once loadFromCloud has completed at least once for the
   *  current user. Blocks cloud writes until set so the default
   *  store state can't overwrite real cloud values during the
   *  boot race. */
  _cloudHydrated: boolean;

  // Cosmetics
  ownedCosmetics: string[];   // IDs of owned cosmetics
  equippedFrame: string;      // equipped frame ID
  equippedBanner: string;     // equipped banner ID
  equippedNameColor: string;  // equipped name color ID
  equippedExpression: string; // equipped expression ID
  purchaseCosmetic: (id: string, gemCost: number) => boolean;
  unlockCosmetic: (id: string) => void;
  equipCosmetic: (type: 'frame' | 'banner' | 'name_color' | 'expression', id: string) => void;

  // Daily login reward (synced across devices)
  loginReward: LoginRewardState;
  claimLoginReward: (next: LoginRewardState) => void;

  // Economy
  addGems: (a: number) => void;
  spendGems: (a: number) => boolean;
  loseLife: () => void;
  refillLives: () => void;
  refillLivesWithGems: () => boolean;
  addStars: (c: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  /** Toast queue for newly-claimed streak rewards. The root layout renders
   *  `<StreakRewardToast queue={…} onDone={clearStreakRewardQueue} />` and
   *  the result screen pushes after a successful `claimDueStreakRewards()`. */
  streakRewardQueue: ImportedClaimedMilestone[];
  pushStreakRewards: (rewards: ImportedClaimedMilestone[]) => void;
  clearStreakRewardQueue: () => void;
  setRecoveryWindowStart: (iso: string | null) => void;
  /** Applies the result of a successful streak recovery to local state
   *  (gems −cost, streak preserved, window cleared, lastPlayDate = today).
   *  The Supabase mutation has already been committed by the caller —
   *  this just keeps the store in sync without requiring a full reload. */
  applyStreakRecoveryLocal: (gemsDelta: number, shieldsDelta: number) => void;
  /** Nukes the streak + clears the window. Used for "Let it reset" and
   *  on window-expiry detection. */
  resetStreakLocal: () => void;
  checkLifeRegen: () => void;
  buyPowerUp: (id: string, qty?: number, cost?: number) => boolean;
  usePowerUp: (id: string) => boolean;
  getPowerUpCount: (id: string) => number;

  // Level completion with economy
  /** Returns `{ earned, doubled }`. `earned` is the actual gem amount
   *  added to the player's balance (after the Blanked+ 2× multiplier,
   *  if applicable). `doubled` is true when the multiplier kicked in,
   *  so result screens can render a "2×" badge next to the reward. */
  recordLevelComplete: (id: string, stars: number, pct: number) => { earned: number; doubled: boolean };

  // Unified Brain Journey
  /** Advance the unified ladder position if the just-completed level
   *  matches the player's CURRENT position. Levels played via the Mode
   *  Library (or replays of older ladder levels) never jump the cursor
   *  ahead — progress there is independent. */
  advanceUnifiedPosition: (completedLevelId: string) => void;
  /** Record the last level the player actually opened (ladder OR library).
   *  Feeds the "Continue Level X" chip on the Journey screen. */
  setLastPlayed: (mode: ModeId, levelId: string) => void;
  /** Flip the first-time intro / migration banner off. Sticky — the intro
   *  never reappears once dismissed. */
  markUnifiedIntroSeen: () => void;
  /** Flip the per-world intro modal off after it's been shown once. */
  markWorldIntroSeen: (world: WorldTheme) => void;
  /** Flip the Brain Master celebration off so it doesn't re-fire on
   *  subsequent app loads after the player has already seen it. */
  markBrainMasterSeen: () => void;
  /** Sister-flag for the Grand Master celebration (position 400). */
  markGrandMasterSeen: () => void;

  // Cloud sync
  syncToCloud: () => void;
  loadFromCloud: (userId: string) => Promise<void>;

  // Helpers
  getNextUnplayedLevelId: () => string;
  getMemoryScore: () => number;
  getCompletedLevelCount: () => number;
  /** Returns true when `subscriptionStatus === 'active'`. Cloud is the
   *  source of truth — `loadFromCloud` rewrites the local value on every
   *  sign-in and foreground resume. */
  isSubscribed: () => boolean;
  /** Paywall success path: flip local status to active, push to cloud.
   *  Optionally records the entitlement's `periodType` so the monthly
   *  gem grant can skip while the user is in a free trial / intro
   *  period. Pass the periodType from `purchaseSubscription`'s return
   *  value or `restorePurchases`'s status. */
  activatePlus: (periodType?: PeriodType) => void;
  /** Refresh `subscriptionPeriodType` from RevenueCat. Called on app
   *  launch / foreground after `loadFromCloud` so the period reflects
   *  what StoreKit currently reports — important when a free trial
   *  has just converted to a paid period. */
  setSubscriptionPeriodType: (periodType: PeriodType) => void;
  /** Credit the monthly Blanked+ 100-gem grant IF the user is an
   *  active subscriber AND their last grant was more than ~30 days
   *  ago (or they've never been granted) AND they are NOT in a free
   *  trial / intro period. Safe to call liberally — on app foreground,
   *  after purchase, after restore. Returns the number of gems granted
   *  (0 if skipped). */
  maybeGrantMonthlyPlusGems: () => number;
  /** Flip the Stage A modal visibility. Used by the modal itself to
   *  close and by dev-only overrides to force-show it. Does NOT write
   *  `lastReviewPromptedAt` — that's `recordReviewPrompted`'s job. */
  setReviewPromptVisible: (v: boolean) => void;
  /** Persist the user's answer to the Stage A modal. Writes both the
   *  outcome and (if not already stamped) the timestamp, then syncs
   *  to Supabase so the decision sticks across reinstalls + devices. */
  recordReviewPrompted: (outcome: 'accepted' | 'dismissed') => void;
  /** Gate + fire Stage A. Call from any peak-joy trigger point — the
   *  function itself decides whether it's actually OK to show. Returns
   *  true if the modal was triggered, false if gated (with the reason
   *  logged to analytics for post-launch tuning). */
  maybeShowReviewPrompt: (trigger: 'level_3_star' | 'friend_win') => boolean;
  /** Persist the user's language choice, flip the active i18n
   *  locale so the UI re-renders in the new language, then sync
   *  to the cloud. */
  setPreferredLanguage: (pref: LanguagePreference) => void;
  /** Update the locally-cached avatar url after a successful upload so
   *  every surface that reads it from the store (profile header, home
   *  tab, etc.) refreshes immediately without waiting for the next
   *  loadFromCloud. The real source of truth is profiles.avatar_url
   *  on Supabase, set by avatarUpload.uploadAvatar. */
  setAvatarUrl: (url: string | null) => void;

  // Hydration — re-read localStorage after mount (fixes SSR/static export)
  hydrate: () => void;
  saveState: () => void;
  setAuthUserId: (id: string) => void;
  /** Wipe every progress-related field back to defaults and clear the
   *  shared AsyncStorage key. Called when a DIFFERENT auth user signs
   *  in on the same device (previously the new account would inherit
   *  the old account's gems/stars/world/streak via stale local state)
   *  and on explicit sign-out. Does NOT touch _hydrated so the UI
   *  doesn't flicker into a "still loading" state. */
  resetForNewUser: () => void;
  revokeSubscription: () => void;
  /** Mark ads as permanently removed (Remove Ads IAP). */
  setAdsRemoved: () => void;
  /** Start the 1-hour unlimited lives boost. */
  activateUnlimitedLives: () => void;
  /** True while the unlimited lives boost is active. */
  hasUnlimitedLives: () => boolean;

  // Gameplay
  startLevel: (l: Level) => void;
  setGameState: (s: GameState) => void;
  selectOption: (i: number | null) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  nextScene: () => void;
  completeLevel: () => void;
  resetGame: () => void;
  /** Increment the "levels cleared this continuous session" counter
   *  used by the endurance_8 weekly challenge. Called from result.tsx
   *  on a successful level complete. */
  bumpSessionLevelCount: () => void;
  /** Reset the session counter — called from the root layout when the
   *  app returns to foreground after being backgrounded for too long. */
  resetSessionLevelCount: () => void;
}

export const LIFE_REGEN_MS = LIVES_CONFIG.regenTimeMinutes * 60 * 1000;

export const useGameStore = create<GameStore>((set, get) => {
  const saved = loadState();

  return {
    gems: saved.gems ?? INITIAL_GEMS,
    lives: saved.lives ?? LIVES_CONFIG.maxLives,
    maxLives: saved.maxLives ?? LIVES_CONFIG.maxLives,
    livesLastLostAt: saved.livesLastLostAt ?? null,
    adsRemoved: saved.adsRemoved ?? false,
    unlimitedLivesUntil: saved.unlimitedLivesUntil ?? null,
    streakCount: saved.streakCount ?? 0,
    bestStreak: saved.bestStreak ?? saved.streakCount ?? 0,
    daysPlayed: saved.daysPlayed ?? 0,
    streakShields: saved.streakShields ?? 0,
    recoveryWindowStart: saved.recoveryWindowStart ?? null,
    streakRewardQueue: [],
    username: saved.username ?? null,
    avatarUrl: saved.avatarUrl ?? null,
    subscriptionStatus: saved.subscriptionStatus ?? 'inactive',
    // Always start as 'unknown' — repopulated by RevenueCat on launch
    // before the first monthly-gem grant check runs.
    subscriptionPeriodType: 'unknown',
    localUpdatedAt: saved.localUpdatedAt ?? 0,
    lastPlayDate: saved.lastPlayDate ?? null,
    lastDailyPlayedDate: saved.lastDailyPlayedDate ?? null,
    lastPlusGemGrantAt: saved.lastPlusGemGrantAt ?? null,
    lastReviewPromptedAt: saved.lastReviewPromptedAt ?? null,
    reviewPromptOutcome: saved.reviewPromptOutcome ?? null,
    reviewPromptVisible: false,
    reviewPromptTrigger: null,
    preferredLanguage: saved.preferredLanguage ?? 'system',
    streakMilestonesClaimed: saved.streakMilestonesClaimed ?? [],
    totalStars: saved.totalStars ?? 0,
    highestWorld: saved.highestWorld ?? 1,
    unifiedPosition: saved.unifiedPosition ?? 1,
    currentWorldTheme: saved.currentWorldTheme ?? getWorldForPosition(saved.unifiedPosition ?? 1),
    lastPlayedMode: saved.lastPlayedMode ?? null,
    lastPlayedLevelId: saved.lastPlayedLevelId ?? null,
    hasSeenUnifiedIntro: saved.hasSeenUnifiedIntro ?? false,
    hasSeenWorldIntro: saved.hasSeenWorldIntro ?? {},
    hasSeenBrainMaster: saved.hasSeenBrainMaster ?? false,
    hasSeenGrandMaster: saved.hasSeenGrandMaster ?? false,
    powerUps: { ...DEFAULT_POWERUPS, ...saved.powerUps },
    levelProgress: saved.levelProgress ?? {},
    completedScores: saved.completedScores ?? [],
    currentLevel: null,
    gameState: 'READY' as GameState,
    currentSceneIndex: 0,
    currentQuestionIndex: 0,
    answers: [] as Answer[],
    selectedOption: null,
    revealedCorrect: null,
    score: 0,
    levelPowerUpsUsed: 0,
    currentQuestionStartedAt: Date.now(),
    sessionLevelCount: 0,
    sessionLastTouchedAt: Date.now(),
    _authUserId: null,
    _hydrated: false,
    // Tracks whether loadFromCloud has completed (success OR failure)
    // for the current signed-in user. Until it flips true, the
    // debounced cloud sync in saveState() is a no-op — this prevents
    // the race where the store's default state (gems:50, subscription:
    // inactive, cosmetics:[]) gets saved to Supabase BEFORE
    // loadFromCloud has a chance to merge the real values in, which
    // wiped some TestFlight users' gems + subscription flag on slow
    // networks (see idjpvp's bug report 2026-04-23).
    _cloudHydrated: false,

    // Cosmetics
    ownedCosmetics: saved.ownedCosmetics ?? [],
    equippedFrame: saved.equippedFrame ?? 'frame_blink_normal',
    equippedBanner: saved.equippedBanner ?? 'banner_none',
    equippedNameColor: saved.equippedNameColor ?? 'name_default',
    equippedExpression: saved.equippedExpression ?? 'expr_normal',

    // Daily login reward
    loginReward: saved.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE },
    claimLoginReward: (next) => {
      set({ loginReward: next });
      setTimeout(() => saveState(get()), 0);
    },
    purchaseCosmetic: (id, gemCost) => {
      const { gems, ownedCosmetics } = get();
      if (ownedCosmetics.includes(id) || gems < gemCost) return false;
      set({ gems: gems - gemCost, ownedCosmetics: [...ownedCosmetics, id] });
      setTimeout(() => saveState(get()), 0);
      // Immediate Supabase push so the new cosmetic survives a hard
      // close before the 2s debounce fires, and so friends can see
      // the player wearing it as soon as they equip it.
      const uid = get()._authUserId;
      if (uid) {
        saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'purchase sync failed', e, { uid }));
        // Track the spend in economy_events so the admin dashboard sees it.
        if (gemCost > 0) {
          logEconomyEvent(uid, ECONOMY_EVENTS.GEM_SPEND_COSMETIC, -gemCost, { cosmeticId: id });
        }
      }
      return true;
    },
    unlockCosmetic: (id) => {
      const { ownedCosmetics } = get();
      if (ownedCosmetics.includes(id)) return;
      set({ ownedCosmetics: [...ownedCosmetics, id] });
      setTimeout(() => saveState(get()), 0);
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'unlock sync failed', e, { uid }));
    },
    equipCosmetic: (type, id) => {
      if (type === 'frame') set({ equippedFrame: id });
      else if (type === 'banner') set({ equippedBanner: id });
      else if (type === 'name_color') set({ equippedNameColor: id });
      else if (type === 'expression') set({ equippedExpression: id });
      setTimeout(() => saveState(get()), 0);
      // Also push immediately to Supabase, bypassing the 2s debounce.
      // Without this, friends wouldn't see the new cosmetic on their
      // profile popup until the player happens to trigger another
      // save (level complete, gem gain, etc). Equipping is rare
      // enough that the extra write per tap is fine.
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'equip sync failed', e, { uid }));
    },

    /**
     * Add gems and play the gem-clink sound. The sound used to live
     * inside `AnimatedGemCount` (fired when the count prop changed),
     * which had two bugs: (a) hydration writes from `loadFromCloud`
     * looked like a "+N gain" if the cloud round trip took longer
     * than the 1.5s grace window, so a fresh login played the sound
     * for no reason; (b) gems claimed from a modal on a screen
     * that didn't render the gem pill (e.g. weekly challenges)
     * were silent because the component wasn't mounted.
     *
     * Moving the sound to `addGems` fixes both — `loadFromCloud`
     * uses `set({ gems: ... })` directly so it never plays, and
     * any "user earned gems" caller (level complete, weekly claim,
     * login reward, ad reward) plays the sound regardless of which
     * screen is foregrounded.
     */
    addGems: (amount) => {
      if (amount <= 0) return;
      set((s) => ({ gems: s.gems + amount }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      try { require('@/src/lib/sounds').sounds.play('gemClink'); } catch {}
      setTimeout(() => saveState(get()), 0);
    },
    spendGems: (amount) => { const { gems } = get(); if (gems < amount) return false; set({ gems: gems - amount }); setTimeout(() => saveState(get()), 0); return true; },
    loseLife: () => {
      // Don't deduct a life if the unlimited-lives boost is active
      // OR the user has an active Blanked+ subscription (unlimited lives).
      const { unlimitedLivesUntil, subscriptionStatus } = get();
      if (subscriptionStatus === 'active') return;
      if (unlimitedLivesUntil && Date.now() < unlimitedLivesUntil) return;
      set((s) => ({ lives: Math.max(0, s.lives - 1), livesLastLostAt: s.livesLastLostAt ?? Date.now() }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.LIFE_LOST, -1, { levelId: get().currentLevel?.id });
    },
    refillLives: () => {
      set((s) => ({ lives: s.maxLives, livesLastLostAt: null }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.IAP_LIVES, LIVES_CONFIG.maxLives, { method: 'iap' });
    },
    refillLivesWithGems: () => {
      const { gems } = get();
      if (gems < LIVES_CONFIG.gemRefillCost) return false;
      set((s) => ({ gems: s.gems - LIVES_CONFIG.gemRefillCost, lives: s.maxLives, livesLastLostAt: null }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_SPEND_LIVES, -LIVES_CONFIG.gemRefillCost);
      return true;
    },
    addStars: (count) => { set((s) => ({ totalStars: s.totalStars + count })); setTimeout(() => saveState(get()), 0); },
    incrementStreak: () => {
      const today = new Date().toISOString().split('T')[0];
      const { lastPlayDate, streakCount, bestStreak, daysPlayed, _authUserId } = get();
      if (lastPlayDate === today) return; // Already played today
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const continuing = lastPlayDate === yesterday;

      // SAFETY NET: do NOT silently nuke a non-zero streak to 1 when
      // a multi-day gap is detected mid-play. The streak-recovery
      // modal in the root layout handles those gaps explicitly (gems,
      // shield, or let-reset). If we land here with a gap and a live
      // streak it means recovery hasn't run yet (the modal fires on
      // app launch + foreground; this branch can fire if the player
      // somehow plays a level before the check resolves, e.g. cloud
      // sync still in flight). Bailing without changing state means:
      //   - streakCount stays at its real value
      //   - lastPlayDate stays in the past so the next app launch's
      //     gap detection still sees the missed days and the recovery
      //     modal can fire
      //   - the player isn't penalised for a sync race
      // Pre-fix: this branch reset newStreak to 1 and overwrote
      // lastPlayDate with today, silently destroying multi-day
      // streaks and hiding the gap from the recovery flow forever.
      if (!continuing && streakCount > 0 && lastPlayDate !== null) {
        log.warn('streak', 'gap detected during incrementStreak; deferring to recovery flow', {
          streakCount, lastPlayDate, today,
        });
        return;
      }

      // Brand-new player (streak === 0 or never played) starting today.
      const newStreak = continuing ? streakCount + 1 : 1;
      // Detect a BROKEN streak (prev run was ≥1 and gap > 1 day). The
      // player's rebuilding from scratch so every milestone row goes back
      // to unclaimed — re-climbing earns the rewards a second time.
      // (After the safety net above, this branch only runs when
      // streakCount === 0 so resetAllStreakRewards is a no-op in
      // practice; left in for defensive symmetry with the previous
      // semantics.)
      if (!continuing && streakCount > 0) {
        if (_authUserId) {
          resetAllStreakRewards(_authUserId);
        }
        set({ streakMilestonesClaimed: [] });
      }
      set({
        streakCount: newStreak,
        bestStreak: Math.max(bestStreak, newStreak),
        daysPlayed: daysPlayed + 1, // This branch only runs on a new calendar day
        lastPlayDate: today,
      });
      setTimeout(() => saveState(get()), 0);
    },
    resetStreak: () => {
      // Legacy action — kept for any external callers. Shield consumption is
      // NOT handled here; that lives in the app-open check in streakRecovery.ts
      // and the recovery modal path, where we have enough context (days
      // missed, window state) to decide what to do.
      set({ streakCount: 0, lastPlayDate: null, recoveryWindowStart: null });
      setTimeout(() => saveState(get()), 0);
    },
    setLastDailyPlayedDate: (iso) => {
      // Persist locally so the home card's "done today" badge survives
      // a transient Supabase blip (network, session refresh, RLS read
      // race) when the player revisits the home tab. The Supabase
      // daily_challenge_results row stays the source of truth for
      // cross-device sync; this is a same-day client cache.
      set({ lastDailyPlayedDate: iso });
      setTimeout(() => saveState(get()), 0);
    },
    pushStreakRewards: (rewards) => {
      if (!rewards || rewards.length === 0) return;
      set((s) => ({ streakRewardQueue: [...s.streakRewardQueue, ...rewards] }));
    },
    clearStreakRewardQueue: () => set({ streakRewardQueue: [] }),
    setRecoveryWindowStart: (iso) => {
      set({ recoveryWindowStart: iso });
      setTimeout(() => saveState(get()), 0);
    },
    applyStreakRecoveryLocal: (gemsDelta, shieldsDelta) => {
      const today = new Date().toISOString().split('T')[0];
      set((s) => ({
        gems: Math.max(0, s.gems + gemsDelta),
        streakShields: Math.max(0, s.streakShields + shieldsDelta),
        recoveryWindowStart: null,
        lastPlayDate: today,
      }));
      setTimeout(() => saveState(get()), 0);
    },
    resetStreakLocal: () => {
      const uid = get()._authUserId;
      set({
        streakCount: 0,
        lastPlayDate: null,
        recoveryWindowStart: null,
        // Clear local claimed mirror so the rewards timeline stops showing
        // "CLAIMED" badges on milestones until cloud catches up
        streakMilestonesClaimed: [],
      });
      setTimeout(() => saveState(get()), 0);
      // Flip every streak_rewards row back to unclaimed so the player can
      // re-earn rewards on their next climb. Fire-and-forget — the local
      // mirror is already cleared for instant UI feedback.
      if (uid) resetAllStreakRewards(uid);
    },
    checkLifeRegen: () => {
      const { lives, maxLives, livesLastLostAt } = get();
      if (lives >= maxLives || !livesLastLostAt) return;
      const elapsed = Date.now() - livesLastLostAt;
      const regen = Math.floor(elapsed / LIFE_REGEN_MS);
      if (regen > 0) {
        const actualRegen = Math.min(regen, maxLives - lives);
        const nl = Math.min(maxLives, lives + actualRegen);
        set({ lives: nl, livesLastLostAt: nl >= maxLives ? null : Date.now() - (elapsed % LIFE_REGEN_MS) });
        setTimeout(() => saveState(get()), 0);
        if (actualRegen > 0) logEconomyEvent(getUserId(), ECONOMY_EVENTS.LIFE_REGEN, actualRegen);
      }
    },

    // Power-up inventory
    buyPowerUp: (id, qty = 1, costOverride?) => {
      const singleCost = costOverride ?? (POWER_UP_COSTS as Record<string, number>)[id] ?? 30;
      const totalCost = bundlePrice(singleCost, qty);
      const { gems } = get();
      if (gems < totalCost) return false;
      set((s) => ({
        gems: s.gems - totalCost,
        powerUps: { ...s.powerUps, [id]: (s.powerUps[id as keyof PowerUpInventory] ?? 0) + qty },
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_SPEND_POWERUP, -totalCost, { powerUp: id, qty });
      return true;
    },
    usePowerUp: (id) => {
      const { powerUps } = get();
      const count = powerUps[id as keyof PowerUpInventory] ?? 0;
      if (count <= 0) return false;
      set((s) => ({
        powerUps: { ...s.powerUps, [id]: (s.powerUps[id as keyof PowerUpInventory] ?? 0) - 1 },
        // Bump the per-level counter so we can tell "used zero" from
        // "used at least one" when recording weekly challenge progress.
        levelPowerUpsUsed: s.levelPowerUpsUsed + 1,
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.POWERUP_USED, -1, { powerUp: id, levelId: get().currentLevel?.id });
      return true;
    },
    getPowerUpCount: (id) => get().powerUps[id as keyof PowerUpInventory] ?? 0,

    // Level completion with replay economy
    recordLevelComplete: (levelId, stars, scorePercent) => {
      if (!levelId) return { earned: 0, doubled: false };
      const clampedStars = Math.max(0, Math.min(3, stars));
      const clampedScore = Math.max(0, Math.min(100, scorePercent));
      const existing = get().levelProgress[levelId];
      let baseGems = 0;

      if (existing) {
        baseGems = calculateReplayReward(existing.stars, clampedStars);
      } else {
        baseGems = GEM_REWARDS[clampedStars as 0 | 1 | 2 | 3] ?? 0;
      }

      // Blanked+ 2× multiplier — applied at the source so every level
      // gem award (classic, mastermind, snap match, side campaign) goes
      // through the same path. The replay-improvement reward is
      // doubled too: a 1→3 star jump used to hand 2 gems, now hands 4
      // for subscribers.
      const isPlus = get().subscriptionStatus === 'active';
      const { gems: gemsEarned, doubled } = applyPlusGemMultiplier(baseGems, isPlus);

      set((s) => ({
        gems: s.gems + gemsEarned,
        levelProgress: {
          ...s.levelProgress,
          [levelId]: {
            stars: existing ? Math.max(existing.stars, clampedStars) : clampedStars,
            bestScore: existing ? Math.max(existing.bestScore, clampedScore) : clampedScore,
            attempts: existing ? existing.attempts + 1 : 1,
          },
        },
        completedScores: [...s.completedScores.slice(-499), clampedScore],
      }));
      setTimeout(() => saveState(get()), 0);

      // Immediately sync to cloud so progress is saved even if app is killed
      const uid = get()._authUserId;
      if (uid) {
        setTimeout(() => saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'post-level sync failed', e, { uid })), 500);
      }

      // Log to economy tracker
      if (gemsEarned > 0) {
        logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_EARN_LEVEL, gemsEarned, { levelId, stars: clampedStars, scorePercent: clampedScore, replay: !!existing, plusDoubled: doubled });
      }
      // Meta App Events — fire LevelAchieved at the 5 + 25 unique-clear
      // milestones for ad funnel optimisation. Only on first-time
      // completion (replays don't grow the unique count).
      if (!existing) {
        const uniqueCleared = Object.keys(get().levelProgress).length;
        if (uniqueCleared === 5 || uniqueCleared === 25) {
          logLevelAchieved(uniqueCleared);
        }
      }
      return { earned: gemsEarned, doubled };
    },

    advanceUnifiedPosition: (completedLevelId) => {
      const ladderPos = getPositionForLevelId(completedLevelId);
      if (ladderPos === undefined) return;
      const { unifiedPosition } = get();
      // Only the CURRENT position advances the cursor. Playing an older
      // level from the Mode Library (or replaying to earn extra stars)
      // must not skip positions forward.
      if (ladderPos !== unifiedPosition) return;
      const next = Math.min(TOTAL_POSITIONS, unifiedPosition + 1);
      set({
        unifiedPosition: next,
        currentWorldTheme: getWorldForPosition(next),
      });
      setTimeout(() => saveState(get()), 0);
    },

    setLastPlayed: (mode, levelId) => {
      const { lastPlayedMode, lastPlayedLevelId } = get();
      if (lastPlayedMode === mode && lastPlayedLevelId === levelId) return;
      set({ lastPlayedMode: mode, lastPlayedLevelId: levelId });
      setTimeout(() => saveState(get()), 0);
    },

    markUnifiedIntroSeen: () => {
      if (get().hasSeenUnifiedIntro) return;
      set({ hasSeenUnifiedIntro: true });
      setTimeout(() => saveState(get()), 0);
    },

    markWorldIntroSeen: (world) => {
      const current = get().hasSeenWorldIntro;
      if (current[world]) return;
      set({ hasSeenWorldIntro: { ...current, [world]: true } });
      setTimeout(() => saveState(get()), 0);
    },

    markBrainMasterSeen: () => {
      if (get().hasSeenBrainMaster) return;
      set({ hasSeenBrainMaster: true });
      setTimeout(() => saveState(get()), 0);
    },

    markGrandMasterSeen: () => {
      if (get().hasSeenGrandMaster) return;
      set({ hasSeenGrandMaster: true });
      setTimeout(() => saveState(get()), 0);
    },

    getNextUnplayedLevelId: () => { const { levelProgress } = get(); const ids = buildLevelIds(); return ids.find((id) => !(id in levelProgress)) ?? ids[ids.length - 1]; },
    getMemoryScore: () => { const { completedScores } = get(); if (completedScores.length === 0) return 0; return Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length); },
    getCompletedLevelCount: () => Object.keys(get().levelProgress).length,
    isSubscribed: () => get().subscriptionStatus === 'active',
    setAvatarUrl: (url) => {
      set({ avatarUrl: url });
      setTimeout(() => saveState(get()), 0);
    },
    activatePlus: (periodType) => {
      const patch: Partial<GameStore> = { subscriptionStatus: 'active' };
      if (periodType !== undefined) patch.subscriptionPeriodType = periodType;
      set(patch as GameStore);
      setTimeout(() => saveState(get()), 0);
      // Push immediately rather than waiting for the 2s debounce so a
      // subsequent foreground resume / loadFromCloud can't race the sync
      // and mistakenly strip the unlock we just granted.
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'activate plus sync failed', e, { uid }));
    },

    setSubscriptionPeriodType: (periodType) => {
      if (get().subscriptionPeriodType === periodType) return;
      set({ subscriptionPeriodType: periodType });
      // periodType is runtime-derived from RevenueCat — don't persist
      // it to Supabase. We do save locally so a quick reload picks it
      // up before the next StoreKit refresh resolves.
      setTimeout(() => saveState(get()), 0);
    },

    maybeGrantMonthlyPlusGems: () => {
      const state = get();
      // Not subscribed? Nothing to grant.
      if (state.subscriptionStatus !== 'active') return 0;
      // Skip during free trial / discounted intro period — the user
      // hasn't paid yet. Granting the monthly gems here would let
      // someone trial-and-cancel for free gems repeatedly, and
      // matches Apple's recommended pattern of withholding paid
      // benefits during introductory periods.
      const period = state.subscriptionPeriodType;
      if (period === 'trial' || period === 'intro') return 0;
      // 30 days expressed in ms — the same cadence Apple uses to
      // roll monthly subscriptions. Yearly subscribers get grants
      // every 30 days too, so the yearly plan still rewards
      // 12 × 100 = 1,200 gems across the year. This matches the
      // paywall copy "100 gems every month".
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const lastAt = state.lastPlusGemGrantAt ? Date.parse(state.lastPlusGemGrantAt) : 0;
      // Bad ISO strings parse to NaN — treat them as "never granted".
      const lastMs = Number.isFinite(lastAt) ? lastAt : 0;
      if (lastMs > 0 && nowMs - lastMs < THIRTY_DAYS_MS) return 0;
      // Atomic-ish: bump gems + timestamp together so a crash between
      // the two can't leave us double-granting on the next open.
      set({
        gems: state.gems + 100,
        lastPlusGemGrantAt: new Date(nowMs).toISOString(),
      });
      setTimeout(() => saveState(get()), 0);
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'plus gem grant sync failed', e, { uid }));
      log.breadcrumb('purchases', 'monthly plus gems granted', { lastAt: state.lastPlusGemGrantAt });
      return 100;
    },

    setReviewPromptVisible: (v: boolean) => {
      // Clear the trigger when closing so stale values don't leak
      // into the next prompt's analytics. The modal reads trigger
      // BEFORE calling close, so it sees the correct value.
      set(v ? { reviewPromptVisible: true } : { reviewPromptVisible: false, reviewPromptTrigger: null });
    },

    setPreferredLanguage: (pref: LanguagePreference) => {
      // Flip the active i18n locale first so the UI re-renders in
      // the new language on the next frame — the store write that
      // follows will trigger it anyway via the _layout effect, but
      // doing it synchronously here means buttons don't flash the
      // old language between tap and re-render.
      applyLanguage(pref);
      set({ preferredLanguage: pref });
      setTimeout(() => saveState(get()), 0);
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => log.error('sync', 'language pref sync failed', e, { uid, pref }));
    },

    recordReviewPrompted: (outcome) => {
      const nowIso = new Date().toISOString();
      set({
        lastReviewPromptedAt: nowIso,
        reviewPromptOutcome: outcome,
      });
      // Debounced cloud sync fires via saveState. Fire-and-forget —
      // if the sync fails we'll just re-sync on the next write and
      // the local value is already the source of truth for gating.
      setTimeout(() => saveState(get()), 0);
    },

    maybeShowReviewPrompt: (trigger) => {
      const state = get();
      // Bail if the modal's already up. Two triggers firing in the
      // same moment (e.g. 3-star on a level that also won a friend
      // challenge race) would otherwise double-stamp the timestamp
      // and double-track SHOWN.
      if (state.reviewPromptVisible) return false;
      const snapshot: ReviewPromptState = {
        reviewPromptOutcome: state.reviewPromptOutcome,
        lastReviewPromptedAt: state.lastReviewPromptedAt,
        completedLevelCount: Object.keys(state.levelProgress).length,
        lives: state.lives,
      };
      const result = shouldShowReviewPrompt(snapshot);
      if (!result.ok) {
        track(EVENTS.REVIEW_PROMPT_SKIPPED, { trigger, reason: result.reason });
        return false;
      }
      // Stamp the timestamp BEFORE showing the modal so a crash
      // mid-prompt still burns the cooldown slot. Prevents a
      // crash-loop from spamming the prompt on every relaunch.
      // The outcome stays null until the user actually taps a button.
      const nowIso = new Date().toISOString();
      set({
        lastReviewPromptedAt: nowIso,
        reviewPromptVisible: true,
        reviewPromptTrigger: trigger,
      });
      setTimeout(() => saveState(get()), 0);
      track(EVENTS.REVIEW_PROMPT_SHOWN, { trigger });
      return true;
    },

    // Re-read localStorage after mount — fixes static export where loadState() runs before window is ready
    hydrate: () => {
      if (get()._hydrated) return;
      migrateWorldProgress();
      const saved = loadState();
      if (typeof saved.gems === 'number') {
        set({
          gems: saved.gems ?? INITIAL_GEMS,
          lives: saved.lives ?? LIVES_CONFIG.maxLives,
          maxLives: saved.maxLives ?? LIVES_CONFIG.maxLives,
          livesLastLostAt: saved.livesLastLostAt ?? null,
          adsRemoved: saved.adsRemoved ?? false,
          unlimitedLivesUntil: saved.unlimitedLivesUntil ?? null,
          streakCount: saved.streakCount ?? 0,
          bestStreak: saved.bestStreak ?? saved.streakCount ?? 0,
          daysPlayed: saved.daysPlayed ?? 0,
          streakShields: saved.streakShields ?? 0,
          streakRewardQueue: [],
          username: saved.username ?? null,
          avatarUrl: saved.avatarUrl ?? null,
          subscriptionStatus: saved.subscriptionStatus ?? 'inactive',
          subscriptionPeriodType: 'unknown',
          localUpdatedAt: saved.localUpdatedAt ?? 0,
          streakMilestonesClaimed: saved.streakMilestonesClaimed ?? [],
          lastPlayDate: saved.lastPlayDate ?? null,
          lastDailyPlayedDate: saved.lastDailyPlayedDate ?? null,
          lastPlusGemGrantAt: saved.lastPlusGemGrantAt ?? null,
          lastReviewPromptedAt: saved.lastReviewPromptedAt ?? null,
          reviewPromptOutcome: saved.reviewPromptOutcome ?? null,
          preferredLanguage: saved.preferredLanguage ?? 'system',
          totalStars: saved.totalStars ?? 0,
          highestWorld: saved.highestWorld ?? 1,
          powerUps: { ...DEFAULT_POWERUPS, ...(saved.powerUps ?? {}) },
          levelProgress: saved.levelProgress ?? {},
          completedScores: saved.completedScores ?? [],
          ownedCosmetics: saved.ownedCosmetics ?? [],
          equippedFrame: (saved.ownedCosmetics ?? []).includes(saved.equippedFrame ?? '') || saved.equippedFrame === 'frame_blink_normal' || saved.equippedFrame === 'frame_none' ? (saved.equippedFrame ?? 'frame_blink_normal') : 'frame_blink_normal',
          equippedBanner: (saved.ownedCosmetics ?? []).includes(saved.equippedBanner ?? '') || saved.equippedBanner === 'banner_none' || saved.equippedBanner === 'banner_purple_wave' ? (saved.equippedBanner ?? 'banner_none') : 'banner_none',
          equippedNameColor: (saved.ownedCosmetics ?? []).includes(saved.equippedNameColor ?? '') || saved.equippedNameColor === 'name_default' ? (saved.equippedNameColor ?? 'name_default') : 'name_default',
          equippedExpression: (saved.ownedCosmetics ?? []).includes(saved.equippedExpression ?? '') || saved.equippedExpression === 'expr_normal' ? (saved.equippedExpression ?? 'expr_normal') : 'expr_normal',
          loginReward: saved.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE },
          unifiedPosition: saved.unifiedPosition ?? 1,
          currentWorldTheme: saved.currentWorldTheme ?? getWorldForPosition(saved.unifiedPosition ?? 1),
          lastPlayedMode: saved.lastPlayedMode ?? null,
          lastPlayedLevelId: saved.lastPlayedLevelId ?? null,
          hasSeenUnifiedIntro: saved.hasSeenUnifiedIntro ?? false,
          hasSeenWorldIntro: saved.hasSeenWorldIntro ?? {},
          hasSeenBrainMaster: saved.hasSeenBrainMaster ?? false,
          hasSeenGrandMaster: saved.hasSeenGrandMaster ?? false,
          _hydrated: true,
        });
      } else {
        set({ _hydrated: true });
      }
    },
    saveState: () => saveState(get()),
    setAuthUserId: (id: string) => set({ _authUserId: id }),
    resetForNewUser: () => {
      // Nuke every user-scoped AsyncStorage key so the new account
      // doesn't inherit the previous user's tutorial-seen flag,
      // activity feed, weekly-challenge progress, seasonal event
      // progress, referral code, starter-pack state, etc. Fire and
      // forget — AsyncStorage.multiRemove is async but we don't
      // need to await because the in-memory Zustand state is what
      // drives the UI and we update that synchronously below.
      try {
        AsyncStorage.multiRemove(USER_SCOPED_STORAGE_KEYS).catch(() => {});
      } catch {}
      // Web fallback — localStorage is synchronous and separate from
      // AsyncStorage on RNWeb-less platforms, so remove explicitly.
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          for (const k of USER_SCOPED_STORAGE_KEYS) localStorage.removeItem(k);
        }
      } catch {}
      // Kill any pending debounced sync so we don't push the old
      // user's snapshot to the new user's row milliseconds after
      // this reset fires.
      clearTimeout((saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer);

      set({
        // Clear the ownership stamp so any in-flight save timer that
        // reads live state AFTER this reset doesn't push to the
        // previous user's row. CloudSyncLoader sets the new user's
        // id via `setAuthUserId(user.id)` immediately before
        // `loadFromCloud` runs, so the window where _authUserId is
        // null is tiny and safe.
        _authUserId: null,
        // Re-lock the cloud-hydration flag so the next signed-in user
        // can't overwrite their cloud row with the zeroed state below
        // while loadFromCloud is still fetching.
        _cloudHydrated: false,
        // Economy
        gems: 0,
        lives: 5,
        maxLives: 5,
        livesLastLostAt: null,
        adsRemoved: false,
        unlimitedLivesUntil: null,
        // Streak
        streakCount: 0,
        bestStreak: 0,
        daysPlayed: 0,
        streakShields: 0,
        streakMilestonesClaimed: [],
        lastPlayDate: null,
        lastDailyPlayedDate: null,
        lastPlusGemGrantAt: null,
        lastReviewPromptedAt: null,
        reviewPromptOutcome: null,
        reviewPromptVisible: false,
        reviewPromptTrigger: null,
        // Language pref resets to 'system' — a new account follows
        // the device locale until they explicitly pick one.
        preferredLanguage: 'system' as LanguagePreference,
        // Progress
        totalStars: 0,
        highestWorld: 1,
        unifiedPosition: 1,
        currentWorldTheme: 'emerald_grove' as WorldTheme,
        lastPlayedMode: null,
        lastPlayedLevelId: null,
        hasSeenUnifiedIntro: false,
        hasSeenWorldIntro: {},
        hasSeenBrainMaster: false,
        hasSeenGrandMaster: false,
        levelProgress: {},
        completedScores: [],
        powerUps: { ...DEFAULT_POWERUPS },
        // Cosmetics — new user owns nothing; defaults equipped
        ownedCosmetics: [],
        equippedFrame: 'frame_blink_normal',
        equippedBanner: 'banner_none',
        equippedNameColor: 'name_default',
        equippedExpression: 'expr_normal',
        // Profile
        username: '',
        avatarUrl: null,
        // Subscription — cloud will re-hydrate if the new user is
        // actually on an active plan via RevenueCat.
        subscriptionStatus: 'inactive',
        subscriptionPeriodType: 'unknown',
        // Daily login reward
        loginReward: { ...INITIAL_LOGIN_REWARD_STATE },
        // In-flight gameplay state — reset so a level started under
        // the old user doesn't bleed into the new session.
        currentLevel: null,
        gameState: 'READY' as GameState,
        currentSceneIndex: 0,
        currentQuestionIndex: 0,
        answers: [] as Answer[],
        selectedOption: null,
        revealedCorrect: null,
        score: 0,
        levelPowerUpsUsed: 0,
        sessionLevelCount: 0,
        streakRewardQueue: [],
        recoveryWindowStart: null,
        localUpdatedAt: 0,
      });
    },
    revokeSubscription: () => {
      // Flip status to inactive, strip subscriber-only cosmetics, and reset
      // any equipped subscriber cosmetics back to defaults. Called by
      // `loadFromCloud` when the cloud reports inactive (cross-device
      // cancellation), and future RevenueCat entitlement listeners.
      const { ownedCosmetics, equippedFrame, equippedBanner, equippedNameColor, equippedExpression } = get();
      const cleaned = ownedCosmetics.filter(id => !SUBSCRIBER_COSMETIC_IDS.includes(id));
      set({
        subscriptionStatus: 'inactive',
        subscriptionPeriodType: 'unknown',
        ownedCosmetics: cleaned,
        equippedFrame: SUBSCRIBER_COSMETIC_IDS.includes(equippedFrame) ? 'frame_blink_normal' : equippedFrame,
        equippedBanner: SUBSCRIBER_COSMETIC_IDS.includes(equippedBanner) ? 'banner_none' : equippedBanner,
        equippedNameColor: SUBSCRIBER_COSMETIC_IDS.includes(equippedNameColor) ? 'name_default' : equippedNameColor,
        equippedExpression: SUBSCRIBER_COSMETIC_IDS.includes(equippedExpression) ? 'expr_normal' : equippedExpression,
      });
      setTimeout(() => saveState(get()), 0);
    },

    setAdsRemoved: () => {
      set({ adsRemoved: true });
      setTimeout(() => saveState(get()), 0);
    },
    activateUnlimitedLives: () => {
      const until = Date.now() + 60 * 60 * 1000; // 1 hour from now
      set({ unlimitedLivesUntil: until, lives: get().maxLives, livesLastLostAt: null });
      setTimeout(() => saveState(get()), 0);
    },
    hasUnlimitedLives: () => {
      const { unlimitedLivesUntil, subscriptionStatus } = get();
      if (subscriptionStatus === 'active') return true;
      if (unlimitedLivesUntil && Date.now() < unlimitedLivesUntil) return true;
      return false;
    },

    // Cloud sync
    syncToCloud: () => {
      const state = get();
      if (state._authUserId && state._cloudHydrated) {
        saveProgressToSupabase(state._authUserId, state).catch((e) => log.error('sync', 'manual syncToCloud failed', e, { uid: state._authUserId }));
      }
    },
    loadFromCloud: async (userId: string) => {
      const cloud = await loadProgressFromSupabase(userId);
      if (!cloud) {
        // Failure (offline, rate-limited, auth expired). Flip the
        // hydration flag anyway — otherwise writes stay blocked
        // forever for users with a flaky connection and their local
        // progress can't sync when they come back online.
        set({ _cloudHydrated: true });
        return;
      }
      const local = get();

      // ── Cross-account contamination guard ────────────────────────
      // If the in-memory state's implicit owner (local._authUserId)
      // doesn't match the userId we're loading FOR, local state is
      // either stale from a previous sign-in OR was never properly
      // reset on sign-out. Merging it would fold the PREVIOUS user's
      // cosmetics / stars / login-reward into THIS user's row on
      // the next save — the exact bug that duplicated idjpvp's
      // premium cosmetics onto juanjo's profile.
      //
      // We treat `local` as empty in that case so the merge falls
      // through to cloud values across the board. It's safe because
      // we're about to overwrite in-memory with the merged state
      // anyway, and any legitimately newer-on-this-device values
      // (e.g. offline play that beat the cloud) only apply when
      // the user is the same as the cloud row's owner.
      const localOwnerMatches = !local._authUserId || local._authUserId === userId;
      const safeLocal = localOwnerMatches ? local : {
        ...local,
        gems: 0,
        lives: 5,
        maxLives: 5,
        livesLastLostAt: null,
        streakCount: 0,
        bestStreak: 0,
        daysPlayed: 0,
        streakShields: 0,
        recoveryWindowStart: null,
        totalStars: 0,
        highestWorld: 1,
        levelProgress: {},
        completedScores: [],
        ownedCosmetics: [],
        equippedFrame: 'frame_blink_normal',
        equippedBanner: 'banner_none',
        equippedNameColor: 'name_default',
        equippedExpression: 'expr_normal',
        powerUps: { ...DEFAULT_POWERUPS },
        streakMilestonesClaimed: [],
        lastPlayDate: null,
        lastDailyPlayedDate: null,
        lastPlusGemGrantAt: null,
        lastReviewPromptedAt: null,
        reviewPromptOutcome: null,
        preferredLanguage: 'system' as LanguagePreference,
        loginReward: { ...INITIAL_LOGIN_REWARD_STATE },
        localUpdatedAt: 0,
        username: null,
        avatarUrl: null,
        subscriptionStatus: 'inactive' as SubscriptionStatus,
        subscriptionPeriodType: 'unknown' as PeriodType,
        unifiedPosition: 1,
        currentWorldTheme: 'emerald_grove' as WorldTheme,
        lastPlayedMode: null,
        lastPlayedLevelId: null,
        hasSeenUnifiedIntro: false,
        hasSeenWorldIntro: {},
        hasSeenBrainMaster: false,
      };
      if (!localOwnerMatches) {
        log.warn('sync', 'cross-account loadFromCloud — forcing cloud-only hydrate', {
          localOwner: local._authUserId, incoming: userId,
        });
      }

      // ── Timestamp-based truth source ─────────────────────────────
      // Previously this code used `localHasProgress = levelProgress has entries`
      // to decide whether to prefer local or cloud for scalar fields
      // like gems and equipped_*. That was wrong because a device
      // with STALE local data (from an earlier session) would still
      // have a populated levelProgress and would silently overwrite
      // the cloud's fresh state. Now we compare `local.localUpdatedAt`
      // against the cloud's `updated_at` trigger timestamp and use
      // whichever side wrote more recently. On a fresh device with
      // no local save at all, `localUpdatedAt` is 0 and cloud wins
      // by default.
      const localIsNewer = safeLocal.localUpdatedAt > cloud.cloudUpdatedAt;

      // Merge level progress — always keep the best from either source
      // regardless of timestamps, since levels can only improve.
      const mergedProgress = { ...cloud.levelProgress };
      for (const [id, lp] of Object.entries(safeLocal.levelProgress)) {
        const cp = mergedProgress[id];
        if (!cp) {
          mergedProgress[id] = lp;
        } else {
          mergedProgress[id] = {
            stars: Math.max(cp.stars, lp.stars),
            bestScore: Math.max(cp.bestScore, lp.bestScore),
            attempts: Math.max(cp.attempts, lp.attempts),
          };
        }
      }

      // Recalculate total stars from merged progress
      const mergedTotalStars = Object.values(mergedProgress).reduce((sum, p) => sum + p.stars, 0);
      const mergedScores = Object.values(mergedProgress).filter(p => p.bestScore > 0).map(p => p.bestScore);

      // ── Subscription: cloud is the source of truth ──
      // Cancellation propagates across devices here. If cloud says inactive
      // we drop local subscriber cosmetics and reset equipped items to
      // defaults — matching the same cleanup as `revokeSubscription`.
      // (The one exception is that `activatePlus` syncs immediately, so a
      //  freshly-bought local 'active' will be on the cloud before the next
      //  foreground resume fires loadFromCloud.)
      const cloudSubStatus: SubscriptionStatus = cloud.subscriptionStatus ?? 'inactive';
      const cloudIsActive = cloudSubStatus === 'active';

      // Merge cosmetics — keep union of both local and cloud (never lose a
      // purchase) UNLESS cloud says the user isn't a subscriber, in which
      // case subscriber-only cosmetics get stripped from the merge.
      let mergedCosmetics = [...new Set([...safeLocal.ownedCosmetics, ...cloud.ownedCosmetics])];
      if (!cloudIsActive) {
        mergedCosmetics = mergedCosmetics.filter((id) => !SUBSCRIBER_COSMETIC_IDS.includes(id));
      }
      // Resolve the "what should this equipped slot be?" question:
      //  - If the incoming id is nullish (never synced, fresh account)
      //     OR is a subscriber cosmetic on a non-subscriber → fall back.
      //  - Otherwise use whatever was passed in. This prevents null from
      //     leaking into the store and getting persisted to Supabase,
      //     which historically left the equipped_* columns stuck at null
      //     and made friends see a default Blink instead of the real
      //     customisation.
      const resolveEquipped = (id: string | null | undefined, fallback: string): string => {
        if (!id) return fallback;
        if (!cloudIsActive && SUBSCRIBER_COSMETIC_IDS.includes(id)) return fallback;
        return id;
      };

      // Login reward: pick whichever record was claimed most recently so the
      // player's streak and position in the 7-day cycle follow them across
      // devices. A claim from today always wins.
      const pickLoginReward = (): LoginRewardState => {
        const localLR = safeLocal.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE };
        const cloudLR = cloud.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE };
        if (!localLR.lastClaimDate) return cloudLR;
        if (!cloudLR.lastClaimDate) return localLR;
        return cloudLR.lastClaimDate >= localLR.lastClaimDate ? cloudLR : localLR;
      };

      // Scalar merge — newer side wins. gems/lives/livesLastLostAt and
      // all four equipped slots fall into this bucket. Counters that
      // can only grow (streak/bestStreak/daysPlayed/totalStars/highestWorld)
      // use Math.max regardless so nobody loses a record.
      const pickScalar = <T,>(localVal: T, cloudVal: T): T => (localIsNewer ? localVal : cloudVal);

      set({
        _authUserId: userId, // lock the merged state to THIS user
        gems: pickScalar(safeLocal.gems, cloud.gems),
        lives: pickScalar(safeLocal.lives, cloud.lives),
        livesLastLostAt: pickScalar(safeLocal.livesLastLostAt, cloud.livesLastLostAt),
        streakCount: Math.max(cloud.streakCount, safeLocal.streakCount),
        bestStreak: Math.max(cloud.bestStreak ?? 0, safeLocal.bestStreak ?? 0, cloud.streakCount, safeLocal.streakCount),
        daysPlayed: Math.max(cloud.daysPlayed ?? 0, safeLocal.daysPlayed ?? 0),
        // Server is the source of truth for shields (so claims sync across devices)
        streakShields: cloud.streakShields ?? safeLocal.streakShields ?? 0,
        // Recovery window is server-authoritative — cross-device consistency matters
        recoveryWindowStart: cloud.recoveryWindowStart ?? null,
        // Username is server-sourced (set via app/username.tsx). Cloud wins;
        // keep local only as a fallback if cloud hasn't returned one.
        username: cloud.username ?? safeLocal.username ?? null,
        // Avatar url is server-sourced too (set via avatarUpload.ts
        // after a Supabase Storage upload succeeds). Prefer cloud
        // unless local was updated more recently (covers the narrow
        // window where the user JUST uploaded on this device and the
        // first save with the new URL hasn't persisted to cloud yet).
        avatarUrl: pickScalar(safeLocal.avatarUrl, cloud.avatarUrl),
        totalStars: mergedTotalStars,
        highestWorld: Math.max(cloud.highestWorld, safeLocal.highestWorld),
        levelProgress: mergedProgress,
        completedScores: mergedScores,
        subscriptionStatus: cloudSubStatus,
        // periodType is RC-derived, not synced. If cloud says inactive we
        // can confidently reset to 'unknown'; otherwise leave whatever was
        // last refreshed locally — _layout will re-fetch from RC shortly
        // after this returns and overwrite via setSubscriptionPeriodType.
        ...(cloudIsActive ? {} : { subscriptionPeriodType: 'unknown' as PeriodType }),
        ownedCosmetics: mergedCosmetics,
        equippedFrame: resolveEquipped(pickScalar(safeLocal.equippedFrame, cloud.equippedFrame), 'frame_blink_normal'),
        equippedBanner: resolveEquipped(pickScalar(safeLocal.equippedBanner, cloud.equippedBanner), 'banner_none'),
        equippedNameColor: resolveEquipped(pickScalar(safeLocal.equippedNameColor, cloud.equippedNameColor), 'name_default'),
        equippedExpression: resolveEquipped(pickScalar(safeLocal.equippedExpression, cloud.equippedExpression), 'expr_normal'),
        // Power-ups: keep the max of each type from local and cloud
        powerUps: (() => {
          const merged = { ...safeLocal.powerUps };
          for (const [key, val] of Object.entries(cloud.powerUps)) {
            merged[key as keyof typeof merged] = Math.max((merged as any)[key] ?? 0, val as number);
          }
          return merged;
        })(),
        // Streak milestones: union of claimed milestones (prevent re-claiming)
        streakMilestonesClaimed: [...new Set([...safeLocal.streakMilestonesClaimed, ...cloud.streakMilestonesClaimed])],
        // lastPlayDate: take the most recent of the two. Plain string max
        // works because the format is YYYY-MM-DD (lexicographic = chronological).
        // This handles cross-device play (other device played later → cloud
        // wins) while still letting "I just played here" beat stale cloud.
        lastPlayDate: ((): string | null => {
          const a = safeLocal.lastPlayDate;
          const b = cloud.lastPlayDate;
          if (!a) return b ?? null;
          if (!b) return a;
          return a > b ? a : b;
        })(),
        // Monthly gem grant timestamp: take the MOST RECENT of the
        // two so a fresh grant on device A can't be "undone" by a
        // stale cloud value and accidentally double-grant on
        // device B. Both are ISO strings so lexicographic compare
        // is chronological.
        lastPlusGemGrantAt: ((): string | null => {
          const a = safeLocal.lastPlusGemGrantAt;
          const b = cloud.lastPlusGemGrantAt;
          if (!a) return b ?? null;
          if (!b) return a;
          return a > b ? a : b;
        })(),
        // Review prompt timestamp: most-recent wins (same reasoning as
        // the gem-grant timestamp — prevents a stale cloud value from
        // resurrecting a cooldown that's already elapsed locally).
        lastReviewPromptedAt: ((): string | null => {
          const a = safeLocal.lastReviewPromptedAt;
          const b = cloud.lastReviewPromptedAt;
          if (!a) return b ?? null;
          if (!b) return a;
          return a > b ? a : b;
        })(),
        // Review prompt outcome: 'accepted' is sticky across devices —
        // once a user has given us their App Store rating, we never
        // want to re-prompt from ANY device. Otherwise take whichever
        // side has a value.
        reviewPromptOutcome: ((): 'accepted' | 'dismissed' | null => {
          const a = safeLocal.reviewPromptOutcome ?? null;
          const b = cloud.reviewPromptOutcome ?? null;
          if (a === 'accepted' || b === 'accepted') return 'accepted';
          return a ?? b ?? null;
        })(),
        // Language preference: explicit pick ('en' / 'es') always
        // beats 'system' — if either device has been set to a
        // specific language, honour it across all devices. When
        // both sides are explicit, newer side wins via pickScalar.
        preferredLanguage: ((): LanguagePreference => {
          const a = safeLocal.preferredLanguage ?? 'system';
          const b = cloud.preferredLanguage ?? 'system';
          if (a !== 'system' && b !== 'system') return pickScalar(a, b);
          if (a !== 'system') return a;
          if (b !== 'system') return b;
          return 'system';
        })(),
        // completedScores already merged above (line ~762) via mergedScores —
        // an older version of this block also wrote it here under a now-dead
        // `localHasProgress` flag, which silently overrode the merged value.
        maxLives: Math.max(safeLocal.maxLives, cloud.maxLives),
        loginReward: pickLoginReward(),
        // ── Unified Brain Journey merge ──
        // Three sources to reconcile:
        //   1. cloud.unifiedPosition — the server's cached cursor
        //   2. safeLocal.unifiedPosition — offline progress on this device
        //   3. recompute from mergedProgress — walks the ladder and
        //      finds the first uncompleted level
        // We take the MAX of all three so the user never moves backward
        // regardless of which source is freshest. mergedProgress is
        // authoritative because it's the union of cloud + local level
        // stars, so it catches both "ran ahead offline" and "played on
        // another device" scenarios even if one side's cursor field
        // hasn't been flushed yet.
        unifiedPosition: ((): number => {
          let firstUncompleted = 1;
          for (const level of UNIFIED_LADDER) {
            const entry = mergedProgress[level.levelId];
            if (!entry || entry.stars <= 0) {
              firstUncompleted = level.position;
              break;
            }
            firstUncompleted = level.position + 1;
          }
          const recomputed = Math.min(TOTAL_POSITIONS, Math.max(1, firstUncompleted));
          return Math.max(
            recomputed,
            safeLocal.unifiedPosition ?? 1,
            cloud.unifiedPosition ?? 1,
          );
        })(),
        currentWorldTheme: getWorldForPosition(
          (() => {
            let p = 1;
            for (const level of UNIFIED_LADDER) {
              const entry = mergedProgress[level.levelId];
              if (!entry || entry.stars <= 0) { p = level.position; break; }
              p = level.position + 1;
            }
            return Math.max(
              Math.min(TOTAL_POSITIONS, Math.max(1, p)),
              safeLocal.unifiedPosition ?? 1,
              cloud.unifiedPosition ?? 1,
            );
          })(),
        ),
        // One-shot flags: OR between local and cloud so once a user
        // has dismissed an intro on ANY device, it stays dismissed.
        hasSeenUnifiedIntro:
          (safeLocal.hasSeenUnifiedIntro ?? false) || cloud.hasSeenUnifiedIntro,
        hasSeenWorldIntro: {
          ...cloud.hasSeenWorldIntro,
          ...safeLocal.hasSeenWorldIntro,
        },
        hasSeenBrainMaster:
          (safeLocal.hasSeenBrainMaster ?? false) || cloud.hasSeenBrainMaster,
        hasSeenGrandMaster:
          (safeLocal.hasSeenGrandMaster ?? false) || (cloud.hasSeenGrandMaster ?? false),
        // Last-played: newer side wins via pickScalar. These are
        // cosmetic UX hints only — no correctness impact on progression.
        lastPlayedMode: pickScalar(safeLocal.lastPlayedMode ?? null, cloud.lastPlayedMode),
        lastPlayedLevelId: pickScalar(safeLocal.lastPlayedLevelId ?? null, cloud.lastPlayedLevelId),
        // Unblock cloud writes now that we've merged the real cloud
        // state into local. Before this flip, saveState skips its
        // debounced cloud sync so the boot-time default state can't
        // race ahead and clobber the user's row.
        _cloudHydrated: true,
      });
      setTimeout(() => saveState(get()), 0);
    },
    startLevel: (level) => {
      // Reset transient gameplay counters. The session counter is NOT
      // reset here — it accumulates across levels until the app is
      // backgrounded for long enough (handled elsewhere).
      set({
        currentLevel: level,
        gameState: 'MEMORISE' as GameState,
        currentSceneIndex: 0,
        currentQuestionIndex: 0,
        answers: [],
        selectedOption: null,
        revealedCorrect: null,
        score: 0,
        levelPowerUpsUsed: 0,
        currentQuestionStartedAt: Date.now(),
      });
    },
    setGameState: (gameState) => {
      // When the gameplay state machine transitions into QUESTION we
      // stamp the start time so the weekly challenge tracker can tell
      // whether an answer came in under 2 seconds.
      if (gameState === 'QUESTION') {
        set({ gameState, currentQuestionStartedAt: Date.now() });
      } else {
        set({ gameState });
      }
    },
    selectOption: (index) => set({ selectedOption: index }),
    revealAnswer: () => {
      const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers, currentQuestionStartedAt } = get();
      if (!currentLevel) return;
      const scene = currentLevel.scenes[currentSceneIndex];
      if (!scene || currentQuestionIndex >= scene.questions.length) return;
      const q = scene.questions[currentQuestionIndex];
      const isCorrect = selectedOption !== null && selectedOption === q.correctIndex;
      const responseTimeMs = Date.now() - currentQuestionStartedAt;
      set({
        revealedCorrect: q.correctIndex,
        answers: [...answers, { questionId: q.id, selectedIndex: selectedOption, correctIndex: q.correctIndex, isCorrect }],
        gameState: 'REVEAL',
      });
      // Fire-and-forget weekly challenge tracking. Any completion toast
      // is surfaced by the result screen when the level finishes.
      import('@/src/utils/weeklyChallenges')
        .then((m) => m.recordQuestionAnsweredForChallenges(isCorrect, responseTimeMs))
        .catch(() => {});
    },
    nextQuestion: () => {
      const { currentLevel, currentSceneIndex, currentQuestionIndex } = get();
      if (!currentLevel) return;
      const scene = currentLevel.scenes[currentSceneIndex];
      if (!scene) return;
      const nq = currentQuestionIndex + 1;
      if (nq < scene.questions.length) {
        set({ currentQuestionIndex: nq, selectedOption: null, revealedCorrect: null, gameState: 'QUESTION', currentQuestionStartedAt: Date.now() });
      } else {
        const ns = currentSceneIndex + 1;
        if (ns < currentLevel.scenes.length) set({ gameState: 'SCENE_SCORE', selectedOption: null, revealedCorrect: null });
        else get().completeLevel();
      }
    },
    nextScene: () => {
      const { currentSceneIndex } = get();
      set({ currentSceneIndex: currentSceneIndex + 1, currentQuestionIndex: 0, selectedOption: null, revealedCorrect: null, gameState: 'MEMORISE' });
    },
    completeLevel: () => { const { answers, currentLevel } = get(); if (!currentLevel) return; const t = answers.length; const c = answers.filter((a) => a.isCorrect).length; const pct = t > 0 ? Math.round((c / t) * 100) : 0; set({ score: pct, gameState: pct >= currentLevel.requiredScore ? 'COMPLETE' : 'FAILED' }); },
    resetGame: () => set({
      currentLevel: null,
      gameState: 'READY',
      currentSceneIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      selectedOption: null,
      revealedCorrect: null,
      score: 0,
      levelPowerUpsUsed: 0,
    }),
    bumpSessionLevelCount: () => set((s) => ({
      sessionLevelCount: s.sessionLevelCount + 1,
      sessionLastTouchedAt: Date.now(),
    })),
    resetSessionLevelCount: () => set({
      sessionLevelCount: 0,
      sessionLastTouchedAt: Date.now(),
    }),
  };
});
