/**
 * Cosmetics system — Avatar frames, profile banners, name colours.
 * Frames wrap around the player's avatar (Blink or photo).
 * Banners are decorative backgrounds on the profile header.
 * Name colours change the display name colour (subscriber perk).
 */

// ─── TYPES ─────────────────────────────────────────────────
export type CosmeticType = 'frame' | 'banner' | 'name_color' | 'expression';
// Face-variant ids the Blink component knows how to render. The
// expression cosmetic records pick from this list; the Blink SVG
// switch-cases off the matching string.
export type BlinkExpressionId =
  // ── Original 13 ──
  | 'normal' | 'memorise' | 'blank' | 'thinking' | 'correct' | 'wrong'
  | 'celebrate' | 'streak' | 'sad' | 'sleeping' | 'surprised' | 'love'
  | 'premium'
  // ── Expanded catalogue (15 new) ──
  | 'wink' | 'tongue_out'
  | 'pirate' | 'cool_guy' | 'ninja' | 'frozen' | 'angel'
  | 'devil' | 'robot' | 'dizzy'
  | 'golden_blink' | 'galaxy' | 'rainbow' | 'shadow' | 'cherry_blossom'
  // ── Milestone earn-only ──
  | 'sharp_eye' | 'lightning_mind' | 'detective' | 'motion_master'
  | 'mastermind_boss';
export type UnlockMethod = 'free' | 'gems' | 'achievement' | 'subscriber' | 'seasonal' | 'ad' | 'earn';

export interface Cosmetic {
  id: string;
  type: CosmeticType;
  name: string;
  description: string;
  unlock: UnlockMethod;
  gemCost?: number;           // for gem-purchasable items
  achievementId?: string;     // for achievement-linked items
  tier?: 'bronze' | 'silver' | 'gold'; // which achievement tier unlocks it
  subscriberOnly?: boolean;
  seasonal?: string;          // e.g. "christmas_2026", "halloween_2026"
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** True when this item can ALSO be unlocked by watching a rewarded
   *  video ad (only legal for common-rarity items per the spec). The
   *  gem price, if any, still applies for players who'd rather pay. */
  adEligible?: boolean;
  /** For earn-only milestone cosmetics: machine-readable condition. */
  earnCondition?: string;
  /** For earn-only milestone cosmetics: human-readable description. */
  earnDescription?: string;
}

export interface FrameCosmetic extends Cosmetic {
  type: 'frame';
  borderColor: string;
  borderWidth: number;
  glowColor?: string;         // for animated glow frames
  animated?: boolean;         // subscriber-only animated frames
  /** Whether to render tiny sparkle dots at the corners of the frame
   *  (gold on the Halo frame, ice on the Diamond frame). */
  sparkle?: boolean;
}

export interface BannerCosmetic extends Cosmetic {
  type: 'banner';
  /** Gradient stop colours. Can be any length — 2 for the classic
   *  two-stop banners, up to 6 for the multi-stop Holographic banner.
   *  Passed straight into expo-linear-gradient's `colors` prop. */
  gradientColors: string[];
  /** Gradient direction — 'diag' = top-left→bottom-right, 'vert' =
   *  top→bottom. Defaults to diag when omitted. */
  gradientDirection?: 'diag' | 'vert';
  pattern?: 'none' | 'dots' | 'waves' | 'stars' | 'confetti';
}

export interface NameColorCosmetic extends Cosmetic {
  type: 'name_color';
  color: string;
}

export interface ExpressionCosmetic extends Cosmetic {
  type: 'expression';
  blinkExpression: BlinkExpressionId;
}

// ─── BLINK COLOUR VARIANTS (body recolor frames) ───────────
const BLINK_COLORS = {
  purple: { border: '#6C5CE7', glow: '#A29BFE' },    // default, free
  ocean: { border: '#0984E3', glow: '#74B9FF' },
  mint: { border: '#00B894', glow: '#55EFC4' },
  coral: { border: '#FF6B6B', glow: '#FFB8B8' },
  gold: { border: '#D4A012', glow: '#FDCB6E' },
  rose: { border: '#FD79A8', glow: '#FDCFE8' },
  midnight: { border: '#2D3436', glow: '#636E72' },
  sunset: { border: '#E17055', glow: '#FAB1A0' },
};

// ─── ALL FRAMES ────────────────────────────────────────────
export const FRAMES: FrameCosmetic[] = [
  // ── Free / Default ──
  { id: 'frame_none', type: 'frame', name: 'No Frame', description: 'Clean look', unlock: 'free', rarity: 'common', borderColor: 'transparent', borderWidth: 0 },

  // ── Blink Expression Frames (earned via gameplay milestones) ──
  { id: 'frame_blink_normal', type: 'frame', name: 'Blink', description: 'The classic look', unlock: 'free', rarity: 'common', borderColor: '#6C5CE7', borderWidth: 3 },
  { id: 'frame_blink_memorise', type: 'frame', name: 'Focused', description: 'Complete World 1', unlock: 'achievement', achievementId: 'world_traveller', tier: 'bronze', rarity: 'common', borderColor: '#A29BFE', borderWidth: 3 },
  { id: 'frame_blink_correct', type: 'frame', name: 'Sharp Mind', description: 'Get 50 stars', unlock: 'achievement', achievementId: 'collector', tier: 'bronze', rarity: 'common', borderColor: '#00B894', borderWidth: 3 },
  { id: 'frame_blink_streak', type: 'frame', name: 'On Fire', description: 'Reach a 7-day streak', unlock: 'achievement', achievementId: 'streak_legend', tier: 'bronze', rarity: 'rare', borderColor: '#FF6B6B', borderWidth: 3, glowColor: '#FF6B6B' },
  { id: 'frame_blink_celebrate', type: 'frame', name: 'Champion', description: 'Get 150 stars', unlock: 'achievement', achievementId: 'collector', tier: 'silver', rarity: 'rare', borderColor: '#D4A012', borderWidth: 3, glowColor: '#FDCB6E' },
  { id: 'frame_blink_love', type: 'frame', name: 'Beloved', description: 'Add 5 friends', unlock: 'achievement', achievementId: 'social_butterfly', tier: 'bronze', rarity: 'rare', borderColor: '#FD79A8', borderWidth: 3 },

  // ── Colour Variant Frames (gem purchase) ──
  { id: 'frame_ocean', type: 'frame', name: 'Ocean', description: 'Cool blue vibes', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: BLINK_COLORS.ocean.border, borderWidth: 3, glowColor: BLINK_COLORS.ocean.glow },
  { id: 'frame_mint', type: 'frame', name: 'Mint', description: 'Fresh and clean', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: BLINK_COLORS.mint.border, borderWidth: 3, glowColor: BLINK_COLORS.mint.glow },
  { id: 'frame_coral', type: 'frame', name: 'Coral', description: 'Warm sunset tones', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: BLINK_COLORS.coral.border, borderWidth: 3, glowColor: BLINK_COLORS.coral.glow },
  { id: 'frame_gold', type: 'frame', name: 'Gold', description: 'Pure prestige', unlock: 'gems', gemCost: 150, rarity: 'epic', borderColor: BLINK_COLORS.gold.border, borderWidth: 4, glowColor: BLINK_COLORS.gold.glow },
  { id: 'frame_rose', type: 'frame', name: 'Rose', description: 'Soft and sweet', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: BLINK_COLORS.rose.border, borderWidth: 3, glowColor: BLINK_COLORS.rose.glow },
  { id: 'frame_midnight', type: 'frame', name: 'Midnight', description: 'Dark and mysterious', unlock: 'gems', gemCost: 100, rarity: 'epic', borderColor: BLINK_COLORS.midnight.border, borderWidth: 3, glowColor: BLINK_COLORS.midnight.glow },
  { id: 'frame_sunset', type: 'frame', name: 'Sunset', description: 'Warm orange glow', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: BLINK_COLORS.sunset.border, borderWidth: 3, glowColor: BLINK_COLORS.sunset.glow },

  // ── Premium Animated Frames (subscriber-only) ──
  { id: 'frame_prismatic', type: 'frame', name: 'Prismatic', description: 'Animated rainbow border', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', borderColor: '#6C5CE7', borderWidth: 4, glowColor: '#A29BFE', animated: true },
  { id: 'frame_diamond', type: 'frame', name: 'Diamond', description: 'Sparkling diamond ring', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', borderColor: '#74B9FF', borderWidth: 4, glowColor: '#DFE6E9', animated: true },
  { id: 'frame_premium_gold', type: 'frame', name: 'Premium Gold', description: 'Exclusive Blanked+ gold ring', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', borderColor: '#D4A012', borderWidth: 4, glowColor: '#FDCB6E', animated: true },

  // ── Achievement Mastery Frames ──
  { id: 'frame_perfectionist', type: 'frame', name: 'Perfectionist', description: 'Get 3 stars on 20 levels', unlock: 'achievement', achievementId: 'perfectionist', tier: 'gold', rarity: 'epic', borderColor: '#D4A012', borderWidth: 4, glowColor: '#F9CA24' },
  { id: 'frame_master', type: 'frame', name: 'Grand Master', description: 'Reach Master division', unlock: 'achievement', achievementId: 'level_grinder', tier: 'gold', rarity: 'legendary', borderColor: '#1A1A18', borderWidth: 4, glowColor: '#D4A012' },

  // ── Gradient Frames (gem purchase) ──
  { id: 'frame_gradient_sunset', type: 'frame', name: 'Sunset Fade', description: 'Orange-to-pink gradient ring', unlock: 'gems', gemCost: 100, rarity: 'epic', borderColor: '#E17055', borderWidth: 4, glowColor: '#FAB1A0' },
  { id: 'frame_gradient_ocean', type: 'frame', name: 'Deep Sea', description: 'Blue-to-teal gradient ring', unlock: 'gems', gemCost: 100, rarity: 'epic', borderColor: '#0984E3', borderWidth: 4, glowColor: '#74B9FF' },
  { id: 'frame_gradient_aurora', type: 'frame', name: 'Aurora Ring', description: 'Green-to-purple shimmer', unlock: 'gems', gemCost: 120, rarity: 'epic', borderColor: '#00B894', borderWidth: 4, glowColor: '#A29BFE' },
  { id: 'frame_dotted', type: 'frame', name: 'Dotted', description: 'Playful dotted border', unlock: 'gems', gemCost: 60, rarity: 'rare', borderColor: '#6C5CE7', borderWidth: 3 },
  { id: 'frame_double_ring', type: 'frame', name: 'Double Ring', description: 'Two-ring elegant border', unlock: 'gems', gemCost: 80, rarity: 'rare', borderColor: '#A29BFE', borderWidth: 3, glowColor: '#6C5CE7' },

  // ── Seasonal Frames ──
  { id: 'frame_christmas', type: 'frame', name: 'Festive', description: 'Limited edition holiday ring', unlock: 'seasonal', seasonal: 'christmas', gemCost: 200, rarity: 'legendary', borderColor: '#FF6B6B', borderWidth: 4, glowColor: '#00B894' },
  { id: 'frame_halloween', type: 'frame', name: 'Spooky', description: 'Limited edition spooky ring', unlock: 'seasonal', seasonal: 'halloween', gemCost: 180, rarity: 'legendary', borderColor: '#E17055', borderWidth: 4, glowColor: '#2D3436' },
  { id: 'frame_valentines', type: 'frame', name: 'Sweetheart', description: 'Limited edition love glow', unlock: 'seasonal', seasonal: 'valentines', gemCost: 150, rarity: 'epic', borderColor: '#FD79A8', borderWidth: 3, glowColor: '#FDCFE8' },

  // ── Expanded catalogue (10 new) ──
  // Rares (60 gems)
  { id: 'frame_lightning', type: 'frame', name: 'Lightning', description: 'Electric yellow glow', unlock: 'gems', gemCost: 60, rarity: 'rare', borderColor: '#FFEB3B', borderWidth: 3, glowColor: '#FFEB3B' },
  { id: 'frame_vines', type: 'frame', name: 'Vines', description: 'Living green border', unlock: 'gems', gemCost: 60, rarity: 'rare', borderColor: '#4CAF50', borderWidth: 3 },
  { id: 'frame_ocean_cyan', type: 'frame', name: 'Ocean', description: 'Clear cyan glow', unlock: 'gems', gemCost: 60, rarity: 'rare', borderColor: '#00BCD4', borderWidth: 3, glowColor: '#00BCD4' },
  // Epics (100-120 gems)
  { id: 'frame_flame', type: 'frame', name: 'Flame Ring', description: 'Burning orange aura', unlock: 'gems', gemCost: 100, rarity: 'epic', borderColor: '#FF5722', borderWidth: 3, glowColor: '#FF5722' },
  { id: 'frame_ice_crystal', type: 'frame', name: 'Ice Crystal', description: 'Frosted blue shimmer', unlock: 'gems', gemCost: 100, rarity: 'epic', borderColor: '#4FC3F7', borderWidth: 3, glowColor: '#4FC3F7' },
  { id: 'frame_neon_pulse', type: 'frame', name: 'Neon Pulse', description: 'Electric magenta pulse', unlock: 'gems', gemCost: 120, rarity: 'epic', borderColor: '#E040FB', borderWidth: 3, glowColor: '#E040FB' },
  // Legendaries (250-300 gems)
  { id: 'frame_halo', type: 'frame', name: 'Halo', description: 'Golden halo with sparkle dots', unlock: 'gems', gemCost: 250, rarity: 'legendary', borderColor: '#FFD700', borderWidth: 4, glowColor: '#FFD700', sparkle: true },
  { id: 'frame_galaxy_ring', type: 'frame', name: 'Galaxy Ring', description: 'Deep cosmic purple', unlock: 'gems', gemCost: 250, rarity: 'legendary', borderColor: '#7B1FA2', borderWidth: 4, glowColor: '#7B1FA2' },
  { id: 'frame_diamond_ring', type: 'frame', name: 'Diamond', description: 'Ice-blue sparkle', unlock: 'gems', gemCost: 300, rarity: 'legendary', borderColor: '#B3E5FC', borderWidth: 4, glowColor: '#B3E5FC', sparkle: true },
  // Common (25 gems OR ad) — ad-eligible
  { id: 'frame_dotted_pearl', type: 'frame', name: 'Dotted', description: 'Playful dotted border', unlock: 'gems', gemCost: 25, rarity: 'common', borderColor: '#B2BEC3', borderWidth: 2, adEligible: true },
  // ── Milestone earn-only frames ──
  { id: 'frame_starter', type: 'frame', name: 'Starter', description: 'Your first earned frame', unlock: 'earn', rarity: 'common', borderColor: '#00CEC9', borderWidth: 2, earnCondition: 'classic_w1_l10', earnDescription: 'Reach Level 10 in Shape Basics' },
  { id: 'frame_speedster', type: 'frame', name: 'Speedster', description: 'Fast thinker\'s frame', unlock: 'earn', rarity: 'rare', borderColor: '#FF9F43', borderWidth: 3, glowColor: '#FF9F43', earnCondition: 'classic_w3_l18', earnDescription: 'Reach Level 18 in Numbers & Letters' },
  { id: 'frame_eagle_eye', type: 'frame', name: 'Eagle Eye', description: 'Nothing escapes your gaze', unlock: 'earn', rarity: 'epic', borderColor: '#2ECC71', borderWidth: 3, glowColor: '#2ECC71', earnCondition: 'classic_w4_complete', earnDescription: 'Complete World 4: Moving Objects' },
  { id: 'frame_temporal', type: 'frame', name: 'Temporal', description: 'Master of time and memory', unlock: 'earn', rarity: 'epic', borderColor: '#D4A012', borderWidth: 3, glowColor: '#D4A012', earnCondition: 'classic_w6_l20', earnDescription: 'Reach Level 20 in Deep Memory' },
];

// ─── ALL BANNERS ───────────────────────────────────────────
export const BANNERS: BannerCosmetic[] = [
  { id: 'banner_none', type: 'banner', name: 'Default', description: 'Clean and simple', unlock: 'free', rarity: 'common', gradientColors: ['transparent', 'transparent'] },
  { id: 'banner_purple_wave', type: 'banner', name: 'Purple Wave', description: 'The classic Blanked look', unlock: 'free', rarity: 'common', gradientColors: ['#6C5CE7', '#A29BFE'] },
  { id: 'banner_ocean_depth', type: 'banner', name: 'Ocean Depth', description: 'Deep blue gradient', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#0984E3', '#74B9FF'] },
  { id: 'banner_sunset_glow', type: 'banner', name: 'Sunset Glow', description: 'Warm evening tones', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#E17055', '#FDCB6E'] },
  { id: 'banner_forest', type: 'banner', name: 'Forest', description: 'Natural green gradient', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#00B894', '#55EFC4'] },
  { id: 'banner_midnight', type: 'banner', name: 'Midnight Sky', description: 'Dark and moody', unlock: 'gems', gemCost: 80, rarity: 'epic', gradientColors: ['#2D3436', '#636E72'] },
  { id: 'banner_rose_gold', type: 'banner', name: 'Rose Gold', description: 'Elegant and luxurious', unlock: 'gems', gemCost: 100, rarity: 'epic', gradientColors: ['#FD79A8', '#FDCB6E'] },
  { id: 'banner_streak_fire', type: 'banner', name: 'Streak Fire', description: 'Reach a 30-day streak', unlock: 'achievement', achievementId: 'streak_legend', tier: 'silver', rarity: 'epic', gradientColors: ['#FF6B6B', '#FDCB6E'], pattern: 'none' },
  { id: 'banner_champion', type: 'banner', name: 'Champion', description: 'Win 10 friend challenges', unlock: 'achievement', achievementId: 'champion', tier: 'silver', rarity: 'epic', gradientColors: ['#D4A012', '#F9CA24'], pattern: 'stars' },
  // Subscriber
  { id: 'banner_aurora', type: 'banner', name: 'Aurora', description: 'Animated northern lights', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', gradientColors: ['#6C5CE7', '#00B894'] },
  { id: 'banner_holographic', type: 'banner', name: 'Holographic', description: 'Shifting prismatic colours', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', gradientColors: ['#A29BFE', '#FD79A8'] },
  { id: 'banner_premium_gold', type: 'banner', name: 'Premium Gold', description: 'Exclusive Blanked+ gold gradient', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', gradientColors: ['#2D3436', '#D4A012'] },

  // ── More Gem Banners ──
  { id: 'banner_candy', type: 'banner', name: 'Candy', description: 'Sweet pink-to-purple', unlock: 'gems', gemCost: 80, rarity: 'rare', gradientColors: ['#FD79A8', '#A29BFE'] },
  { id: 'banner_neon', type: 'banner', name: 'Neon', description: 'Electric blue-to-green', unlock: 'gems', gemCost: 100, rarity: 'epic', gradientColors: ['#0984E3', '#00B894'] },
  { id: 'banner_autumn', type: 'banner', name: 'Autumn', description: 'Warm autumn tones', unlock: 'gems', gemCost: 80, rarity: 'rare', gradientColors: ['#E17055', '#D4A012'] },
  { id: 'banner_spring', type: 'banner', name: 'Spring', description: 'Fresh green morning', unlock: 'gems', gemCost: 80, rarity: 'rare', gradientColors: ['#00B894', '#FDCB6E'] },
  { id: 'banner_galaxy', type: 'banner', name: 'Galaxy', description: 'Deep cosmic purple', unlock: 'gems', gemCost: 120, rarity: 'epic', gradientColors: ['#2D3436', '#6C5CE7'] },
  { id: 'banner_ice', type: 'banner', name: 'Ice', description: 'Frosty blue shimmer', unlock: 'gems', gemCost: 80, rarity: 'rare', gradientColors: ['#DFE6E9', '#74B9FF'] },

  // ── Expanded catalogue (12 new) ──
  // Rares (60 gems)
  { id: 'banner_storm', type: 'banner', name: 'Storm', description: 'Thundering indigo sky', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#1A237E', '#4A148C', '#311B92'] },
  { id: 'banner_autumn_leaves', type: 'banner', name: 'Autumn', description: 'Falling autumn fire', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#BF360C', '#E65100', '#F57F17'] },
  { id: 'banner_mint_fresh', type: 'banner', name: 'Mint Fresh', description: 'Cool mint breeze', unlock: 'gems', gemCost: 60, rarity: 'rare', gradientColors: ['#00BFA5', '#1DE9B6', '#A7FFEB'] },
  // Epics (120-150 gems)
  { id: 'banner_lightning_storm', type: 'banner', name: 'Lightning Storm', description: 'Electric purple strike', unlock: 'gems', gemCost: 120, rarity: 'epic', gradientColors: ['#1A1A2E', '#4A148C', '#FFEB3B', '#1A1A2E'] },
  { id: 'banner_aurora_borealis', type: 'banner', name: 'Aurora Borealis', description: 'Dancing northern lights', unlock: 'gems', gemCost: 120, rarity: 'epic', gradientColors: ['#1B5E20', '#00BCD4', '#E040FB', '#1A237E'] },
  { id: 'banner_neon_city', type: 'banner', name: 'Neon City', description: 'Midnight neon skyline', unlock: 'gems', gemCost: 150, rarity: 'epic', gradientColors: ['#0D0D1A', '#E040FB', '#00E5FF', '#0D0D1A'] },
  { id: 'banner_underwater', type: 'banner', name: 'Underwater', description: 'Deep ocean fade', unlock: 'gems', gemCost: 120, rarity: 'epic', gradientColors: ['#0277BD', '#00838F', '#004D40'], gradientDirection: 'vert' },
  { id: 'banner_lava_flow', type: 'banner', name: 'Lava Flow', description: 'Molten rivers of gold', unlock: 'gems', gemCost: 120, rarity: 'epic', gradientColors: ['#BF360C', '#FF6D00', '#FFD600', '#BF360C'] },
  // Legendaries (300-350 gems)
  { id: 'banner_galaxy_legendary', type: 'banner', name: 'Galaxy', description: 'A swirling cosmos', unlock: 'gems', gemCost: 300, rarity: 'legendary', gradientColors: ['#0D0D2B', '#4A148C', '#E040FB', '#00BCD4', '#0D0D2B'] },
  { id: 'banner_holographic_legendary', type: 'banner', name: 'Holographic', description: 'The ultimate flex', unlock: 'gems', gemCost: 350, rarity: 'legendary', gradientColors: ['#FF6B6B', '#FFD93D', '#00B894', '#0984E3', '#6C5CE7', '#FD79A8'] },
  { id: 'banner_celestial', type: 'banner', name: 'Celestial', description: 'Sunrise over the void', unlock: 'gems', gemCost: 300, rarity: 'legendary', gradientColors: ['#000428', '#004e92', '#FFD700'], gradientDirection: 'vert' },
  // Commons (25 gems OR ad) — ad-eligible
  { id: 'banner_pastel_pink', type: 'banner', name: 'Pastel Pink', description: 'Soft and sweet', unlock: 'gems', gemCost: 25, rarity: 'common', gradientColors: ['#FCE4EC', '#F8BBD0'], adEligible: true },
  { id: 'banner_slate', type: 'banner', name: 'Slate', description: 'Muted sophistication', unlock: 'gems', gemCost: 25, rarity: 'common', gradientColors: ['#CFD8DC', '#90A4AE'], adEligible: true },
  // ── Milestone earn-only banners ──
  { id: 'banner_first_steps', type: 'banner', name: 'First Steps', description: 'Your journey begins', unlock: 'earn', rarity: 'rare', gradientColors: ['#00CEC9', '#B2DFDB', '#FFFFFF'], earnCondition: 'classic_w1_complete', earnDescription: 'Complete World 1: Shape Basics' },
  { id: 'banner_colour_pro', type: 'banner', name: 'Colour Pro', description: 'A rainbow of mastery', unlock: 'earn', rarity: 'rare', gradientColors: ['#FF6B6B', '#D4A012', '#00B894', '#0984E3', '#6C5CE7'], earnCondition: 'classic_w2_complete', earnDescription: 'Complete World 2: Colour & Position' },
  { id: 'banner_focused', type: 'banner', name: 'Focused', description: 'Deep concentration vibes', unlock: 'earn', rarity: 'rare', gradientColors: ['#1A237E', '#6C5CE7', '#4A148C'], earnCondition: 'classic_w5_l20', earnDescription: 'Reach Level 20 in Photographic' },
];

// ─── NAME COLOURS ──────────────────────────────────────────
export const NAME_COLORS: NameColorCosmetic[] = [
  { id: 'name_default', type: 'name_color', name: 'Default', description: 'Standard text colour', unlock: 'free', rarity: 'common', color: 'theme' },
  { id: 'name_purple', type: 'name_color', name: 'Royal Purple', description: 'Blanked signature', unlock: 'subscriber', subscriberOnly: true, rarity: 'rare', color: '#6C5CE7' },
  { id: 'name_gold', type: 'name_color', name: 'Gold', description: 'Premium shine', unlock: 'subscriber', subscriberOnly: true, rarity: 'epic', color: '#D4A012' },
  { id: 'name_coral', type: 'name_color', name: 'Coral', description: 'Warm and bold', unlock: 'subscriber', subscriberOnly: true, rarity: 'rare', color: '#FF6B6B' },
  { id: 'name_ocean', type: 'name_color', name: 'Ocean', description: 'Cool and calm', unlock: 'subscriber', subscriberOnly: true, rarity: 'rare', color: '#0984E3' },
  { id: 'name_mint', type: 'name_color', name: 'Mint', description: 'Fresh and bright', unlock: 'subscriber', subscriberOnly: true, rarity: 'rare', color: '#00B894' },
];

// ─── EXPRESSIONS ──────────────────────────────────────────
export const EXPRESSIONS: ExpressionCosmetic[] = [
  { id: 'expr_normal', type: 'expression', name: 'Default', description: 'Classic friendly Blink', unlock: 'free', rarity: 'common', blinkExpression: 'normal' },
  { id: 'expr_memorise', type: 'expression', name: 'Focused', description: 'Wide-eyed concentration', unlock: 'gems', gemCost: 40, rarity: 'rare', blinkExpression: 'memorise' },
  { id: 'expr_thinking', type: 'expression', name: 'Thinker', description: 'Lost in thought', unlock: 'gems', gemCost: 40, rarity: 'rare', blinkExpression: 'thinking' },
  { id: 'expr_correct', type: 'expression', name: 'Nailed It', description: 'Green-eyed confidence', unlock: 'gems', gemCost: 50, rarity: 'rare', blinkExpression: 'correct' },
  { id: 'expr_wrong', type: 'expression', name: 'Oops', description: 'Sweaty and sheepish', unlock: 'gems', gemCost: 30, rarity: 'common', blinkExpression: 'wrong', adEligible: true },
  { id: 'expr_celebrate', type: 'expression', name: 'Party Mode', description: 'Stars and confetti!', unlock: 'gems', gemCost: 60, rarity: 'epic', blinkExpression: 'celebrate' },
  { id: 'expr_streak', type: 'expression', name: 'On Fire', description: 'Flame-headed legend', unlock: 'gems', gemCost: 60, rarity: 'epic', blinkExpression: 'streak' },
  { id: 'expr_sad', type: 'expression', name: 'Blue Day', description: 'Feeling down', unlock: 'gems', gemCost: 30, rarity: 'common', blinkExpression: 'sad', adEligible: true },
  { id: 'expr_sleeping', type: 'expression', name: 'Sleepyhead', description: 'Zzz... peaceful dreams', unlock: 'gems', gemCost: 40, rarity: 'rare', blinkExpression: 'sleeping' },
  { id: 'expr_surprised', type: 'expression', name: 'Shocked', description: 'Eyes wide open', unlock: 'gems', gemCost: 40, rarity: 'rare', blinkExpression: 'surprised' },
  { id: 'expr_love', type: 'expression', name: 'Lovestruck', description: 'Heart eyes and blush', unlock: 'gems', gemCost: 50, rarity: 'rare', blinkExpression: 'love' },
  { id: 'expr_blank', type: 'expression', name: 'Go Blank!', description: 'The signature pose', unlock: 'gems', gemCost: 80, rarity: 'epic', blinkExpression: 'blank' },
  { id: 'expr_premium', type: 'expression', name: 'Premium', description: 'Exclusive Blanked+ star eyes', unlock: 'subscriber', subscriberOnly: true, rarity: 'legendary', blinkExpression: 'premium' },

  // ── Expanded catalogue (15 new) ──
  // Commons (30 gems or ad) — ad-eligible
  { id: 'expr_wink', type: 'expression', name: 'Wink', description: 'Cheeky one-eyed grin', unlock: 'gems', gemCost: 30, rarity: 'common', blinkExpression: 'wink', adEligible: true },
  { id: 'expr_tongue', type: 'expression', name: 'Tongue Out', description: 'Playful tongue out', unlock: 'gems', gemCost: 30, rarity: 'common', blinkExpression: 'tongue_out', adEligible: true },
  // Epics (100-150 gems)
  { id: 'expr_pirate', type: 'expression', name: 'Pirate', description: 'Eye patch and swagger', unlock: 'gems', gemCost: 120, rarity: 'epic', blinkExpression: 'pirate' },
  { id: 'expr_cool', type: 'expression', name: 'Cool Guy', description: 'Shades on, vibe immaculate', unlock: 'gems', gemCost: 120, rarity: 'epic', blinkExpression: 'cool_guy' },
  { id: 'expr_ninja', type: 'expression', name: 'Ninja', description: 'Silent and masked', unlock: 'gems', gemCost: 150, rarity: 'epic', blinkExpression: 'ninja' },
  { id: 'expr_frozen', type: 'expression', name: 'Frozen', description: 'Icy blue wonder', unlock: 'gems', gemCost: 120, rarity: 'epic', blinkExpression: 'frozen' },
  { id: 'expr_angel', type: 'expression', name: 'Angel', description: 'Halo and golden eyes', unlock: 'gems', gemCost: 150, rarity: 'epic', blinkExpression: 'angel' },
  { id: 'expr_devil', type: 'expression', name: 'Little Devil', description: 'Horns and mischief', unlock: 'gems', gemCost: 150, rarity: 'epic', blinkExpression: 'devil' },
  { id: 'expr_robot', type: 'expression', name: 'Robot', description: 'Beep-boop mode', unlock: 'gems', gemCost: 120, rarity: 'epic', blinkExpression: 'robot' },
  { id: 'expr_dizzy', type: 'expression', name: 'Dizzy', description: 'Spinning spiral eyes', unlock: 'gems', gemCost: 100, rarity: 'epic', blinkExpression: 'dizzy' },
  // Legendaries (300-350 gems)
  { id: 'expr_golden', type: 'expression', name: 'Golden Blink', description: 'Crowned gold royalty', unlock: 'gems', gemCost: 300, rarity: 'legendary', blinkExpression: 'golden_blink' },
  { id: 'expr_galaxy', type: 'expression', name: 'Galaxy', description: 'Cosmic purple voyager', unlock: 'gems', gemCost: 300, rarity: 'legendary', blinkExpression: 'galaxy' },
  { id: 'expr_rainbow', type: 'expression', name: 'Rainbow', description: 'Full-spectrum body', unlock: 'gems', gemCost: 350, rarity: 'legendary', blinkExpression: 'rainbow' },
  { id: 'expr_shadow', type: 'expression', name: 'Shadow', description: 'Menacingly cute', unlock: 'gems', gemCost: 300, rarity: 'legendary', blinkExpression: 'shadow' },
  { id: 'expr_cherry', type: 'expression', name: 'Cherry Blossom', description: 'Pink petal bloom', unlock: 'gems', gemCost: 350, rarity: 'legendary', blinkExpression: 'cherry_blossom' },
  // ── Milestone earn-only expressions ──
  { id: 'expr_sharp_eye', type: 'expression', name: 'Sharp Eye', description: 'One eye squinting, brow raised — you see everything', unlock: 'earn', rarity: 'common', blinkExpression: 'sharp_eye', earnCondition: 'classic_w2_l15', earnDescription: 'Reach Level 15 in Colour & Position' },
  { id: 'expr_detective', type: 'expression', name: 'Detective', description: 'Magnifying glass eye — no detail escapes you', unlock: 'earn', rarity: 'rare', blinkExpression: 'detective', earnCondition: 'classic_w4_l18', earnDescription: 'Reach Level 18 in Hidden Details' },
  { id: 'expr_lightning_mind', type: 'expression', name: 'Lightning Mind', description: 'Electric yellow eyes and lightning bolts', unlock: 'earn', rarity: 'epic', blinkExpression: 'lightning_mind', earnCondition: 'classic_w3_complete', earnDescription: 'Complete World 3: Numbers & Letters' },
  { id: 'expr_motion_master', type: 'expression', name: 'Motion Master', description: 'Speed trails blur behind focused blue eyes', unlock: 'earn', rarity: 'epic', blinkExpression: 'motion_master', earnCondition: 'classic_w5_complete', earnDescription: 'Complete World 5: Photographic' },
  { id: 'expr_mastermind', type: 'expression', name: 'Mastermind', description: 'Gold sunglasses. You earned them.', unlock: 'earn', rarity: 'legendary', blinkExpression: 'mastermind_boss', earnCondition: 'classic_w6_complete', earnDescription: 'Complete World 6: Deep Memory' },
];

// ─── DAILY FEATURED SHOP ──────────────────────────────────
function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) { hash = (hash * 31 + dateStr.charCodeAt(i)) | 0; }
  return hash;
}

function shuffleWith<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export interface DailyFeaturedItem {
  cosmetic: Cosmetic;
  originalPrice: number;
  discountedPrice: number;
  /** True when the "20% off" sale is active today (weekends only). */
  onSale: boolean;
}

/** Check if a YYYY-MM-DD date string falls on a Saturday or Sunday UTC.
 *  Used by `getDailyFeatured` to gate the 20% discount. */
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

// Daily-shop rarity weights. Higher = more likely to appear. Commons
// and rares show up most often (good for free-player value + shop
// "activity"), epics are uncommon, legendaries are rare (~4% per
// category slot). This gives the shop a Candy-Crush-ish pacing
// where legendary rotations feel like an event.
const DAILY_RARITY_WEIGHTS: Record<string, number> = {
  common: 10,
  rare: 6,
  epic: 2,
  legendary: 1,
};

function weightedPick<T extends { rarity: string }>(items: T[], rng: () => number): T | null {
  if (items.length === 0) return null;
  const weights = items.map(i => DAILY_RARITY_WEIGHTS[i.rarity] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function getDailyFeatured(dateStr: string): DailyFeaturedItem[] {
  const rng = createSeededRng(dateToSeed('shop-' + dateStr));
  const gemFrames = FRAMES.filter(f => f.unlock === 'gems' && f.gemCost);
  const gemBanners = BANNERS.filter(b => b.unlock === 'gems' && b.gemCost);
  const gemExprs = EXPRESSIONS.filter(e => e.unlock === 'gems' && e.gemCost);

  // Rarity-weighted picks: commons/rares dominate, legendaries are rare.
  const picks: Cosmetic[] = [];
  const frame = weightedPick(gemFrames, rng);
  const banner = weightedPick(gemBanners, rng);
  const expr = weightedPick(gemExprs, rng);
  if (frame) picks.push(frame);
  if (banner) picks.push(banner);
  if (expr) picks.push(expr);
  // Wildcard slot — still weighted by rarity and excludes items
  // already picked above so we never double up.
  const remaining: Cosmetic[] = [...gemFrames, ...gemBanners, ...gemExprs].filter(c => !picks.find(p => p.id === c.id));
  const wild = weightedPick(remaining, rng);
  if (wild) picks.push(wild);

  // Sort common → legendary so the rarest item naturally falls to the
  // last grid position (the wide "hero" card at the bottom of the row).
  picks.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99));

  const onSale = isWeekend(dateStr);
  return picks.map(c => ({
    cosmetic: c,
    originalPrice: c.gemCost!,
    discountedPrice: onSale ? Math.round(c.gemCost! * 0.8) : c.gemCost!,
    onSale,
  }));
}

// ─── HELPERS ───────────────────────────────────────────────
export function getFrameById(id: string): FrameCosmetic | undefined {
  return FRAMES.find(f => f.id === id);
}

export function getBannerById(id: string): BannerCosmetic | undefined {
  return BANNERS.find(b => b.id === id);
}

export function getNameColorById(id: string): NameColorCosmetic | undefined {
  return NAME_COLORS.find(n => n.id === id);
}

export function getAvailableFrames(ownedIds: string[]): { owned: FrameCosmetic[]; locked: FrameCosmetic[] } {
  const owned = FRAMES.filter(f => f.unlock === 'free' || ownedIds.includes(f.id));
  const locked = FRAMES.filter(f => f.unlock !== 'free' && !ownedIds.includes(f.id));
  return { owned, locked };
}

export function getAvailableBanners(ownedIds: string[]): { owned: BannerCosmetic[]; locked: BannerCosmetic[] } {
  const owned = BANNERS.filter(b => b.unlock === 'free' || ownedIds.includes(b.id));
  const locked = BANNERS.filter(b => b.unlock !== 'free' && !ownedIds.includes(b.id));
  return { owned, locked };
}

export function getExpressionById(id: string): ExpressionCosmetic | undefined {
  return EXPRESSIONS.find(e => e.id === id);
}

export function getAvailableExpressions(ownedIds: string[]): { owned: ExpressionCosmetic[]; locked: ExpressionCosmetic[] } {
  const owned = EXPRESSIONS.filter(e => e.unlock === 'free' || ownedIds.includes(e.id));
  const locked = EXPRESSIONS.filter(e => e.unlock !== 'free' && !ownedIds.includes(e.id));
  return { owned, locked };
}

export function getCosmeticById(id: string): (FrameCosmetic | BannerCosmetic | ExpressionCosmetic | NameColorCosmetic) | undefined {
  return (FRAMES as Cosmetic[]).concat(BANNERS, EXPRESSIONS, NAME_COLORS).find(c => c.id === id) as any;
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#636E72',
  rare: '#0984E3',
  epic: '#6C5CE7',
  legendary: '#D4A012',
};

/** Display order for rarity tiers — used by the shop to render
 *  common → rare → epic → legendary instead of whatever order the
 *  item happens to appear in the source file. */
export const RARITY_ORDER: Record<string, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

/** Sort a list of cosmetics in-place by rarity ascending (common
 *  first), keeping items of the same rarity in their original
 *  relative order. Returns a new array — doesn't mutate the input. */
export function sortByRarity<T extends { rarity: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99));
}
