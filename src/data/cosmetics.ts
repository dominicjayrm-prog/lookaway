/**
 * Cosmetics system — Avatar frames, profile banners, name colours.
 * Frames wrap around the player's avatar (Blink or photo).
 * Banners are decorative backgrounds on the profile header.
 * Name colours change the display name colour (subscriber perk).
 */

// ─── TYPES ─────────────────────────────────────────────────
export type CosmeticType = 'frame' | 'banner' | 'name_color';
export type UnlockMethod = 'free' | 'gems' | 'achievement' | 'subscriber' | 'seasonal';

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
}

export interface FrameCosmetic extends Cosmetic {
  type: 'frame';
  borderColor: string;
  borderWidth: number;
  glowColor?: string;         // for animated glow frames
  animated?: boolean;         // subscriber-only animated frames
}

export interface BannerCosmetic extends Cosmetic {
  type: 'banner';
  gradientColors: [string, string];
  pattern?: 'none' | 'dots' | 'waves' | 'stars' | 'confetti';
}

export interface NameColorCosmetic extends Cosmetic {
  type: 'name_color';
  color: string;
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

  // ── Achievement Mastery Frames ──
  { id: 'frame_perfectionist', type: 'frame', name: 'Perfectionist', description: 'Get 3 stars on 20 levels', unlock: 'achievement', achievementId: 'perfectionist', tier: 'gold', rarity: 'epic', borderColor: '#D4A012', borderWidth: 4, glowColor: '#F9CA24' },
  { id: 'frame_master', type: 'frame', name: 'Grand Master', description: 'Reach Master division', unlock: 'achievement', achievementId: 'level_grinder', tier: 'gold', rarity: 'legendary', borderColor: '#1A1A18', borderWidth: 4, glowColor: '#D4A012' },
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

export const RARITY_COLORS: Record<string, string> = {
  common: '#636E72',
  rare: '#0984E3',
  epic: '#6C5CE7',
  legendary: '#D4A012',
};
