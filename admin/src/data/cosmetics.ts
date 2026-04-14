// AUTO-GENERATED minimal cosmetic catalog for admin analytics.
// Source of truth: src/data/cosmetics.ts in the main app.

export type CosmeticType = "frame" | "banner" | "expression" | "name_color";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Unlock = "free" | "gems" | "achievement" | "subscriber" | "seasonal" | "ad" | "earn";

export interface CosmeticMeta {
  id: string;
  name: string;
  type: CosmeticType;
  rarity: Rarity;
  unlock: Unlock;
  gemCost?: number;
  subscriberOnly?: boolean;
}

export const FRAMES: CosmeticMeta[] = [
  { id: "frame_none", name: "No Frame", type: "frame", rarity: "common", unlock: "free" },
  { id: "frame_blink_normal", name: "Blink", type: "frame", rarity: "common", unlock: "free" },
  { id: "frame_blink_memorise", name: "Focused", type: "frame", rarity: "common", unlock: "achievement" },
  { id: "frame_blink_correct", name: "Sharp Mind", type: "frame", rarity: "common", unlock: "achievement" },
  { id: "frame_blink_streak", name: "On Fire", type: "frame", rarity: "rare", unlock: "achievement" },
  { id: "frame_blink_celebrate", name: "Champion", type: "frame", rarity: "rare", unlock: "achievement" },
  { id: "frame_blink_love", name: "Beloved", type: "frame", rarity: "rare", unlock: "achievement" },
  { id: "frame_ocean", name: "Ocean", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_mint", name: "Mint", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_coral", name: "Coral", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_gold", name: "Gold", type: "frame", rarity: "epic", unlock: "gems", gemCost: 150 },
  { id: "frame_rose", name: "Rose", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_midnight", name: "Midnight", type: "frame", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "frame_sunset", name: "Sunset", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_prismatic", name: "Prismatic", type: "frame", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "frame_diamond", name: "Diamond", type: "frame", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "frame_premium_gold", name: "Premium Gold", type: "frame", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "frame_perfectionist", name: "Perfectionist", type: "frame", rarity: "epic", unlock: "achievement" },
  { id: "frame_master", name: "Grand Master", type: "frame", rarity: "legendary", unlock: "achievement" },
  { id: "frame_gradient_sunset", name: "Sunset Fade", type: "frame", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "frame_gradient_ocean", name: "Deep Sea", type: "frame", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "frame_gradient_aurora", name: "Aurora Ring", type: "frame", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "frame_dotted", name: "Dotted", type: "frame", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "frame_double_ring", name: "Double Ring", type: "frame", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "frame_christmas", name: "Festive", type: "frame", rarity: "legendary", unlock: "seasonal", gemCost: 200 },
  { id: "frame_halloween", name: "Spooky", type: "frame", rarity: "legendary", unlock: "seasonal", gemCost: 180 },
  { id: "frame_valentines", name: "Sweetheart", type: "frame", rarity: "epic", unlock: "seasonal", gemCost: 150 },
  { id: "frame_lightning", name: "Lightning", type: "frame", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "frame_vines", name: "Vines", type: "frame", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "frame_ocean_cyan", name: "Ocean", type: "frame", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "frame_flame", name: "Flame Ring", type: "frame", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "frame_ice_crystal", name: "Ice Crystal", type: "frame", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "frame_neon_pulse", name: "Neon Pulse", type: "frame", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "frame_halo", name: "Halo", type: "frame", rarity: "legendary", unlock: "gems", gemCost: 250 },
  { id: "frame_galaxy_ring", name: "Galaxy Ring", type: "frame", rarity: "legendary", unlock: "gems", gemCost: 250 },
  { id: "frame_diamond_ring", name: "Diamond", type: "frame", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "frame_dotted_pearl", name: "Dotted", type: "frame", rarity: "common", unlock: "gems", gemCost: 25 },
  { id: "frame_starter", name: "Starter", type: "frame", rarity: "common", unlock: "earn" },
  { id: "frame_speedster", name: "Speedster", type: "frame", rarity: "rare", unlock: "earn" },
  { id: "frame_eagle_eye", name: "Eagle Eye", type: "frame", rarity: "epic", unlock: "earn" },
  { id: "frame_temporal", name: "Temporal", type: "frame", rarity: "epic", unlock: "earn" },
];

export const BANNERS: CosmeticMeta[] = [
  { id: "banner_none", name: "Default", type: "banner", rarity: "common", unlock: "free" },
  { id: "banner_purple_wave", name: "Purple Wave", type: "banner", rarity: "common", unlock: "free" },
  { id: "banner_ocean_depth", name: "Ocean Depth", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_sunset_glow", name: "Sunset Glow", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_forest", name: "Forest", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_midnight", name: "Midnight Sky", type: "banner", rarity: "epic", unlock: "gems", gemCost: 80 },
  { id: "banner_rose_gold", name: "Rose Gold", type: "banner", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "banner_streak_fire", name: "Streak Fire", type: "banner", rarity: "epic", unlock: "achievement" },
  { id: "banner_champion", name: "Champion", type: "banner", rarity: "epic", unlock: "achievement" },
  { id: "banner_aurora", name: "Aurora", type: "banner", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "banner_holographic", name: "Holographic", type: "banner", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "banner_premium_gold", name: "Premium Gold", type: "banner", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "banner_candy", name: "Candy", type: "banner", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "banner_neon", name: "Neon", type: "banner", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "banner_autumn", name: "Autumn", type: "banner", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "banner_spring", name: "Spring", type: "banner", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "banner_galaxy", name: "Galaxy", type: "banner", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "banner_ice", name: "Ice", type: "banner", rarity: "rare", unlock: "gems", gemCost: 80 },
  { id: "banner_storm", name: "Storm", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_autumn_leaves", name: "Autumn", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_mint_fresh", name: "Mint Fresh", type: "banner", rarity: "rare", unlock: "gems", gemCost: 60 },
  { id: "banner_lightning_storm", name: "Lightning Storm", type: "banner", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "banner_aurora_borealis", name: "Aurora Borealis", type: "banner", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "banner_neon_city", name: "Neon City", type: "banner", rarity: "epic", unlock: "gems", gemCost: 150 },
  { id: "banner_underwater", name: "Underwater", type: "banner", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "banner_lava_flow", name: "Lava Flow", type: "banner", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "banner_galaxy_legendary", name: "Galaxy", type: "banner", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "banner_holographic_legendary", name: "Holographic", type: "banner", rarity: "legendary", unlock: "gems", gemCost: 350 },
  { id: "banner_celestial", name: "Celestial", type: "banner", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "banner_pastel_pink", name: "Pastel Pink", type: "banner", rarity: "common", unlock: "gems", gemCost: 25 },
  { id: "banner_slate", name: "Slate", type: "banner", rarity: "common", unlock: "gems", gemCost: 25 },
  { id: "banner_first_steps", name: "First Steps", type: "banner", rarity: "rare", unlock: "earn" },
  { id: "banner_colour_pro", name: "Colour Pro", type: "banner", rarity: "rare", unlock: "earn" },
  { id: "banner_focused", name: "Focused", type: "banner", rarity: "rare", unlock: "earn" },
];

export const EXPRESSIONS: CosmeticMeta[] = [
  { id: "expr_normal", name: "Default", type: "expression", rarity: "common", unlock: "free" },
  { id: "expr_memorise", name: "Focused", type: "expression", rarity: "rare", unlock: "gems", gemCost: 40 },
  { id: "expr_thinking", name: "Thinker", type: "expression", rarity: "rare", unlock: "gems", gemCost: 40 },
  { id: "expr_correct", name: "Nailed It", type: "expression", rarity: "rare", unlock: "gems", gemCost: 50 },
  { id: "expr_wrong", name: "Oops", type: "expression", rarity: "common", unlock: "gems", gemCost: 30 },
  { id: "expr_celebrate", name: "Party Mode", type: "expression", rarity: "epic", unlock: "gems", gemCost: 60 },
  { id: "expr_streak", name: "On Fire", type: "expression", rarity: "epic", unlock: "gems", gemCost: 60 },
  { id: "expr_sad", name: "Blue Day", type: "expression", rarity: "common", unlock: "gems", gemCost: 30 },
  { id: "expr_sleeping", name: "Sleepyhead", type: "expression", rarity: "rare", unlock: "gems", gemCost: 40 },
  { id: "expr_surprised", name: "Shocked", type: "expression", rarity: "rare", unlock: "gems", gemCost: 40 },
  { id: "expr_love", name: "Lovestruck", type: "expression", rarity: "rare", unlock: "gems", gemCost: 50 },
  { id: "expr_blank", name: "Go Blank!", type: "expression", rarity: "epic", unlock: "gems", gemCost: 80 },
  { id: "expr_premium", name: "Premium", type: "expression", rarity: "legendary", unlock: "subscriber", subscriberOnly: true },
  { id: "expr_wink", name: "Wink", type: "expression", rarity: "common", unlock: "gems", gemCost: 30 },
  { id: "expr_tongue", name: "Tongue Out", type: "expression", rarity: "common", unlock: "gems", gemCost: 30 },
  { id: "expr_pirate", name: "Pirate", type: "expression", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "expr_cool", name: "Cool Guy", type: "expression", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "expr_ninja", name: "Ninja", type: "expression", rarity: "epic", unlock: "gems", gemCost: 150 },
  { id: "expr_frozen", name: "Frozen", type: "expression", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "expr_angel", name: "Angel", type: "expression", rarity: "epic", unlock: "gems", gemCost: 150 },
  { id: "expr_devil", name: "Little Devil", type: "expression", rarity: "epic", unlock: "gems", gemCost: 150 },
  { id: "expr_robot", name: "Robot", type: "expression", rarity: "epic", unlock: "gems", gemCost: 120 },
  { id: "expr_dizzy", name: "Dizzy", type: "expression", rarity: "epic", unlock: "gems", gemCost: 100 },
  { id: "expr_golden", name: "Golden Blink", type: "expression", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "expr_galaxy", name: "Galaxy", type: "expression", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "expr_rainbow", name: "Rainbow", type: "expression", rarity: "legendary", unlock: "gems", gemCost: 350 },
  { id: "expr_shadow", name: "Shadow", type: "expression", rarity: "legendary", unlock: "gems", gemCost: 300 },
  { id: "expr_cherry", name: "Cherry Blossom", type: "expression", rarity: "legendary", unlock: "gems", gemCost: 350 },
  { id: "expr_sharp_eye", name: "Sharp Eye", type: "expression", rarity: "common", unlock: "earn" },
  { id: "expr_detective", name: "Detective", type: "expression", rarity: "rare", unlock: "earn" },
  { id: "expr_lightning_mind", name: "Lightning Mind", type: "expression", rarity: "epic", unlock: "earn" },
  { id: "expr_motion_master", name: "Motion Master", type: "expression", rarity: "epic", unlock: "earn" },
  { id: "expr_mastermind", name: "Mastermind", type: "expression", rarity: "legendary", unlock: "earn" },
];

export const NAME_COLORS: CosmeticMeta[] = [
  { id: "name_default", name: "Default", type: "name_color", rarity: "common", unlock: "free" },
  { id: "name_purple", name: "Royal Purple", type: "name_color", rarity: "rare", unlock: "subscriber", subscriberOnly: true },
  { id: "name_gold", name: "Gold", type: "name_color", rarity: "epic", unlock: "subscriber", subscriberOnly: true },
  { id: "name_coral", name: "Coral", type: "name_color", rarity: "rare", unlock: "subscriber", subscriberOnly: true },
  { id: "name_ocean", name: "Ocean", type: "name_color", rarity: "rare", unlock: "subscriber", subscriberOnly: true },
  { id: "name_mint", name: "Mint", type: "name_color", rarity: "rare", unlock: "subscriber", subscriberOnly: true },
];

export const ALL_COSMETICS: CosmeticMeta[] = [...FRAMES, ...BANNERS, ...EXPRESSIONS, ...NAME_COLORS];