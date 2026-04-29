/**
 * Milestone cosmetics — 12 earn-only cosmetics tied to Classic mode
 * progression. Cannot be purchased with gems. Appear in the shop
 * alongside purchasable items but show a lock icon + earn description
 * instead of a price.
 *
 * Used by:
 *  - Shop tabs (display locked/earned state)
 *  - World map (gift icons on milestone levels)
 *  - Level completion flow (unlock triggers)
 */

export interface MilestoneReward {
  world: number;
  level: number;
  itemId: string;
  itemName: string;
  category: 'expression' | 'frame' | 'banner';
}

/** All Classic mode milestone rewards, ordered by world + level. */
export const MILESTONE_REWARDS: MilestoneReward[] = [
  { world: 1, level: 10, itemId: 'frame_starter', itemName: 'Starter Frame', category: 'frame' },
  { world: 1, level: 20, itemId: 'banner_first_steps', itemName: 'First Steps Banner', category: 'banner' },
  { world: 2, level: 15, itemId: 'expr_sharp_eye', itemName: 'Sharp Eye', category: 'expression' },
  { world: 2, level: 30, itemId: 'banner_colour_pro', itemName: 'Colour Pro Banner', category: 'banner' },
  { world: 3, level: 18, itemId: 'frame_speedster', itemName: 'Speedster Frame', category: 'frame' },
  { world: 3, level: 35, itemId: 'expr_lightning_mind', itemName: 'Lightning Mind', category: 'expression' },
  { world: 4, level: 18, itemId: 'expr_detective', itemName: 'Detective', category: 'expression' },
  { world: 4, level: 35, itemId: 'frame_eagle_eye', itemName: 'Eagle Eye Frame', category: 'frame' },
  { world: 5, level: 20, itemId: 'banner_focused', itemName: 'Focused Banner', category: 'banner' },
  { world: 5, level: 40, itemId: 'expr_motion_master', itemName: 'Motion Master', category: 'expression' },
  { world: 6, level: 20, itemId: 'frame_temporal', itemName: 'Temporal Frame', category: 'frame' },
  { world: 6, level: 40, itemId: 'expr_mastermind', itemName: 'Mastermind', category: 'expression' },
  { world: 6, level: 55, itemId: 'frame_grand_master', itemName: 'Grand Master Frame', category: 'frame' },
];

/** Find milestone rewards for a specific world + level. */
export function getMilestonesForLevel(world: number, level: number): MilestoneReward[] {
  return MILESTONE_REWARDS.filter((m) => m.world === world && m.level === level);
}

/** Find all milestones for a specific world. */
export function getMilestonesForWorld(world: number): MilestoneReward[] {
  return MILESTONE_REWARDS.filter((m) => m.world === world);
}

/** Map an earn condition string back to a world number for the
 *  "Go to World" CTA in the shop info card. */
export function getWorldFromCondition(condition: string): number {
  const map: Record<string, number> = {
    classic_w1_l10: 1, classic_w1_complete: 1,
    classic_w2_l15: 2, classic_w2_complete: 2,
    classic_w3_l18: 3, classic_w3_complete: 3,
    classic_w4_l18: 4, classic_w4_complete: 4,
    classic_w5_l20: 5, classic_w5_complete: 5,
    classic_w6_l20: 6, classic_w6_complete: 6, classic_w6_endgame: 6,
  };
  return map[condition] ?? 1;
}
