import { useGameStore } from '@/src/store';
import { getExpressionById } from '@/src/data/cosmetics';
import type { BlinkExpression } from '@/src/components/Blink';

/**
 * Resolves the current user's equipped Blink expression for anywhere
 * we render the mascot as the USER'S AVATAR — home screen hero, profile,
 * journey path, celebrations, etc. Previously scattered copies of this
 * three-liner lived in every component that touched Blink; consolidated
 * here so a new cosmetic type or rename only changes one place.
 *
 * Returns the fallback 'normal' when the store hasn't loaded yet or when
 * the equipped id doesn't map to a known cosmetic (defensive — shouldn't
 * happen in production since cloud sync validates equipped slots).
 */
export function useEquippedBlinkExpression(): BlinkExpression {
  const equipped = useGameStore((s) => s.equippedExpression);
  const cosmetic = equipped ? getExpressionById(equipped) : undefined;
  return cosmetic?.blinkExpression ?? 'normal';
}

/** Same as above but read-once (non-reactive) — useful inside event
 *  handlers and share-sheet callbacks where we don't want to subscribe. */
export function getEquippedBlinkExpression(): BlinkExpression {
  const equipped = useGameStore.getState().equippedExpression;
  const cosmetic = equipped ? getExpressionById(equipped) : undefined;
  return cosmetic?.blinkExpression ?? 'normal';
}
