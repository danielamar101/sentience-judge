import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  calculateNewRatings,
  calculateMatchResult,
  getKFactor,
} from '@/lib/elo';

describe('ELO', () => {
  describe('calculateExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const result = calculateExpectedScore(1000, 1000);
      expect(result).toBe(0.5);
    });

    it('should return ~0.76 for 200 point advantage', () => {
      const result = calculateExpectedScore(1200, 1000);
      expect(result).toBeCloseTo(0.76, 1);
    });

    it('should return ~0.91 for 400 point advantage', () => {
      const result = calculateExpectedScore(1400, 1000);
      expect(result).toBeCloseTo(0.91, 1);
    });

    it('should return ~0.24 for 200 point disadvantage', () => {
      const result = calculateExpectedScore(1000, 1200);
      expect(result).toBeCloseTo(0.24, 1);
    });
  });

  describe('getKFactor', () => {
    it('should return 32 for new bots with < 30 matches', () => {
      expect(getKFactor(0)).toBe(32);
      expect(getKFactor(15)).toBe(32);
      expect(getKFactor(29)).toBe(32);
    });

    it('should return 16 for established bots with >= 30 matches', () => {
      expect(getKFactor(30)).toBe(16);
      expect(getKFactor(50)).toBe(16);
      expect(getKFactor(100)).toBe(16);
    });
  });

  describe('calculateNewRatings', () => {
    it('should increase winner rating and decrease loser rating', () => {
      const result = calculateNewRatings(1000, 1000, 1); // A wins

      expect(result.newRatingA).toBeGreaterThan(1000);
      expect(result.newRatingB).toBeLessThan(1000);
    });

    it('should have larger swing when underdog wins', () => {
      const underdogWins = calculateNewRatings(1000, 1200, 1); // Lower rated A wins
      const favoriteWins = calculateNewRatings(1200, 1000, 1); // Higher rated A wins

      expect(underdogWins.ratingChangeA).toBeGreaterThan(favoriteWins.ratingChangeA);
    });

    it('should have smaller swing when favorite wins', () => {
      const favoriteWins = calculateNewRatings(1200, 1000, 1); // Higher rated A wins

      expect(favoriteWins.ratingChangeA).toBeLessThan(16); // Less than half of K
    });

    it('should be zero-sum (total rating unchanged)', () => {
      const result = calculateNewRatings(1000, 1000, 1, 0, 0);
      const totalBefore = 1000 + 1000;
      const totalAfter = result.newRatingA + result.newRatingB;

      expect(totalAfter).toBe(totalBefore);
    });
  });

  describe('calculateMatchResult', () => {
    it('should return correct new ratings for winner and loser', () => {
      const result = calculateMatchResult(1000, 1000);

      expect(result.newWinnerRating).toBeGreaterThan(1000);
      expect(result.newLoserRating).toBeLessThan(1000);
    });

    it('should give +16 to winner and -16 to loser for equal ratings', () => {
      const result = calculateMatchResult(1000, 1000);

      expect(result.newWinnerRating).toBe(1016); // K=32, expected=0.5, change=32*0.5=16
      expect(result.newLoserRating).toBe(984);
    });
  });
});
