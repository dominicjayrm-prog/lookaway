/**
 * Tests for the unified-journey → challenge difficulty auto-matcher.
 * Pure function, no network mocks needed — just asserts that the
 * three 380-position tranches map to the legacy Easy/Medium/Hard tiers
 * the Classic level picker understands.
 */
import { bucketUnifiedToDifficulty, averageUnifiedPosition } from '../src/utils/challengeAutoMatch';

describe('bucketUnifiedToDifficulty', () => {
  it('maps early positions to easy', () => {
    expect(bucketUnifiedToDifficulty(1)).toBe('easy');
    expect(bucketUnifiedToDifficulty(50)).toBe('easy');
    expect(bucketUnifiedToDifficulty(127)).toBe('easy');
  });

  it('maps mid positions to medium', () => {
    expect(bucketUnifiedToDifficulty(128)).toBe('medium');
    expect(bucketUnifiedToDifficulty(190)).toBe('medium');
    expect(bucketUnifiedToDifficulty(254)).toBe('medium');
  });

  it('maps late positions to hard', () => {
    expect(bucketUnifiedToDifficulty(255)).toBe('hard');
    expect(bucketUnifiedToDifficulty(300)).toBe('hard');
    expect(bucketUnifiedToDifficulty(380)).toBe('hard');
  });

  it('handles edge case where one player is L1 and the other is L380', () => {
    // Average = 190.5 → floor = 190 → medium. Balanced challenge
    // neither trivial for the veteran nor impossible for the newbie.
    const avg = Math.floor((1 + 380) / 2);
    expect(bucketUnifiedToDifficulty(avg)).toBe('medium');
  });

  it('handles when both players are at the extreme end', () => {
    expect(bucketUnifiedToDifficulty(Math.floor((350 + 380) / 2))).toBe('hard');
  });

  it('handles when both players are at the start', () => {
    expect(bucketUnifiedToDifficulty(Math.floor((1 + 20) / 2))).toBe('easy');
  });
});

describe('averageUnifiedPosition', () => {
  it('averages two valid positions and floors', () => {
    expect(averageUnifiedPosition(10, 21)).toBe(15);
    expect(averageUnifiedPosition(100, 200)).toBe(150);
  });

  it('treats null as position 1', () => {
    expect(averageUnifiedPosition(null, 100)).toBe(50);
    expect(averageUnifiedPosition(100, null)).toBe(50);
  });

  it('treats undefined as position 1', () => {
    expect(averageUnifiedPosition(undefined, undefined)).toBe(1);
  });

  it('clamps out-of-range to 1', () => {
    expect(averageUnifiedPosition(-5, 100)).toBe(50);
    expect(averageUnifiedPosition(1000, 100)).toBe(50);
  });

  it('handles both players at position 380', () => {
    expect(averageUnifiedPosition(380, 380)).toBe(380);
  });
});
