/**
 * useMastermindStages — drives the multi-stage memorise flow.
 *
 * State machine:
 *   idle → memorising (stage 1) → transitioning → memorising (stage 2)
 *   → [transitioning → memorising (stage 3)] → blank → questioning
 *
 * The hook manages timing, stage transitions, and the "go blank"
 * transition. The consumer just reads `phase`, `currentStageIndex`,
 * and `stageOpacity` to render the right thing.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export type MastermindPhase =
  | 'idle'           // Waiting for start
  | 'memorising'     // A stage is visible, timer counting down
  | 'transitioning'  // Brief dim between stages (0.5s)
  | 'blank'          // "Look away!" moment before questions
  | 'questioning'    // Questions phase
  | 'complete';      // All questions answered

interface UseMastermindStagesOpts {
  stageCount: number;
  secondsPerStage: number;
}

interface UseMastermindStagesResult {
  phase: MastermindPhase;
  currentStageIndex: number;
  stageOpacity: number;
  start: () => void;
  goToQuestions: () => void;
  complete: () => void;
}

export function useMastermindStages(opts: UseMastermindStagesOpts): UseMastermindStagesResult {
  const { stageCount, secondsPerStage } = opts;
  const [phase, setPhase] = useState<MastermindPhase>('idle');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageOpacity, setStageOpacity] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  // Drive the state machine when phase changes
  useEffect(() => {
    if (phase === 'memorising') {
      // Show current stage for N seconds, then transition or go blank
      setStageOpacity(1);
      timerRef.current = setTimeout(() => {
        const nextIndex = currentStageIndex + 1;
        if (nextIndex < stageCount) {
          // More stages to show → transition
          setPhase('transitioning');
        } else {
          // All stages shown → go blank
          setPhase('blank');
        }
      }, secondsPerStage * 1000);
    }

    if (phase === 'transitioning') {
      // Dim → flash stage label → show next stage
      setStageOpacity(0.3);
      timerRef.current = setTimeout(() => {
        setCurrentStageIndex((prev) => prev + 1);
        setPhase('memorising');
      }, 500);
    }

    if (phase === 'blank') {
      setStageOpacity(0);
      timerRef.current = setTimeout(() => {
        setPhase('questioning');
      }, 1200);
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = useCallback(() => {
    setCurrentStageIndex(0);
    setStageOpacity(1);
    setPhase('memorising');
  }, []);

  const goToQuestions = useCallback(() => {
    setPhase('questioning');
  }, []);

  const complete = useCallback(() => {
    setPhase('complete');
  }, []);

  return {
    phase,
    currentStageIndex,
    stageOpacity,
    start,
    goToQuestions,
    complete,
  };
}
