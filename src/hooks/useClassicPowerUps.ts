/**
 * useClassicPowerUps — encapsulates the classic-mode power-up state machine.
 *
 * Classic power-ups (slowTime, peek, fiftyFifty, skip) work the same way
 * across every classic-gameplay screen: campaign levels, speed round,
 * friend-challenge classic mode, side campaign, etc. This hook consolidates
 * the identical wiring so each screen just imports one hook instead of
 * duplicating ~60 lines of state + handlers.
 *
 * What it exposes:
 *  - state: usedPowerUps, hiddenOptions, showPeekScene, timerBonus,
 *           buyPopupId, activePowerUp
 *  - handlers: handleSlowTime (MEMORISE), handleQuestionPowerUp (QUESTION),
 *              handleBuyPopupPurchased, setBuyPopupId, clearActivePowerUp
 *  - peekTimeoutRef: exposed so screens can clear it alongside their own
 *                    reveal/transition timeouts
 *
 * The consumer is responsible for rendering <SlowTimeButton>,
 * <PowerUpBar>, <BuyPowerUpPopup>, and <PowerUpFlash>, applying
 * timerBonus to the MEMORISE countdown, and feeding hiddenOptions /
 * showPeekScene into QuestionCard / SceneRenderer.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '@/src/store';
import { sounds } from '@/src/lib/sounds';
import type { PowerUpId } from '@/src/utils/scoring';
import type { Question } from '@/src/types/game';

const isWeb = Platform.OS === 'web';

type ActivePowerUp = 'slowTime' | 'peek' | 'fiftyFifty' | 'skip' | null;

interface UseClassicPowerUpsArgs {
  /** Callback invoked when the player uses Skip — must auto-select the correct answer. */
  onSkip: (correctIndex: number) => void;
  /** The question currently shown, needed for fiftyFifty / skip. */
  currentQuestion: Question | undefined;
  /** Peek duration in ms (default 2000). */
  peekMs?: number;
  /** Slow-time seconds added to MEMORISE (default 3). */
  slowTimeBonus?: number;
}

export function useClassicPowerUps({
  onSkip,
  currentQuestion,
  peekMs = 2000,
  slowTimeBonus = 3,
}: UseClassicPowerUpsArgs) {
  const usePowerUp = useGameStore((s) => s.usePowerUp);
  const powerUps = useGameStore((s) => s.powerUps) ?? { slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0 };

  const [usedPowerUps, setUsedPowerUps] = useState<Record<PowerUpId, boolean>>({
    slowTime: false, peek: false, fiftyFifty: false, skip: false,
  });
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showPeekScene, setShowPeekScene] = useState(false);
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [timerBonus, setTimerBonus] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp>(null);

  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current); };
  }, []);

  /** Reset all power-up state — call when starting a new level/round. */
  const resetPowerUps = useCallback(() => {
    setUsedPowerUps({ slowTime: false, peek: false, fiftyFifty: false, skip: false });
    setHiddenOptions([]);
    setShowPeekScene(false);
    setBuyPopupId(null);
    setTimerBonus(0);
    setActivePowerUp(null);
    if (peekTimeoutRef.current) { clearTimeout(peekTimeoutRef.current); peekTimeoutRef.current = null; }
  }, []);

  const handleSlowTime = useCallback(() => {
    if (usedPowerUps.slowTime) return;
    if ((powerUps.slowTime ?? 0) <= 0) { setBuyPopupId('slowTime'); return; }
    usePowerUp('slowTime');
    setUsedPowerUps(p => ({ ...p, slowTime: true }));
    setTimerBonus(slowTimeBonus);
    setActivePowerUp('slowTime');
    sounds.play('powerUp');
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [usedPowerUps.slowTime, powerUps.slowTime, usePowerUp, slowTimeBonus]);

  const handleQuestionPowerUp = useCallback((id: PowerUpId) => {
    if (usedPowerUps[id]) return;
    if ((powerUps[id] ?? 0) <= 0) { setBuyPopupId(id); return; }

    if (id === 'peek') {
      usePowerUp('peek');
      setUsedPowerUps(p => ({ ...p, peek: true }));
      setShowPeekScene(true);
      setActivePowerUp('peek');
      sounds.play('powerUp');
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      peekTimeoutRef.current = setTimeout(() => setShowPeekScene(false), peekMs);
    } else if (id === 'fiftyFifty' && currentQuestion) {
      usePowerUp('fiftyFifty');
      setUsedPowerUps(p => ({ ...p, fiftyFifty: true }));
      setActivePowerUp('fiftyFifty');
      const wrong = currentQuestion.options.map((_: string, i: number) => i).filter((i: number) => i !== currentQuestion.correctIndex);
      const shuffled = [...wrong].sort(() => Math.random() - 0.5);
      setHiddenOptions(shuffled.slice(0, 2));
      sounds.play('powerUp');
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (id === 'skip' && currentQuestion) {
      usePowerUp('skip');
      setUsedPowerUps(p => ({ ...p, skip: true }));
      setActivePowerUp('skip');
      sounds.play('powerUp');
      onSkip(currentQuestion.correctIndex);
    }
  }, [usedPowerUps, powerUps, usePowerUp, currentQuestion, onSkip, peekMs]);

  const handleBuyPopupPurchased = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    if (id === 'slowTime') handleSlowTime();
    else handleQuestionPowerUp(id);
  }, [handleSlowTime, handleQuestionPowerUp]);

  const clearActivePowerUp = useCallback(() => setActivePowerUp(null), []);

  /** Consumer should call this after each question transition to clear
   *  the fiftyFifty hidden options so they don't bleed into the next
   *  question. */
  const clearHiddenOptions = useCallback(() => setHiddenOptions([]), []);

  return {
    // state
    usedPowerUps,
    hiddenOptions,
    showPeekScene,
    buyPopupId,
    timerBonus,
    activePowerUp,
    // handlers
    handleSlowTime,
    handleQuestionPowerUp,
    handleBuyPopupPurchased,
    setBuyPopupId,
    clearActivePowerUp,
    clearHiddenOptions,
    resetPowerUps,
  };
}
