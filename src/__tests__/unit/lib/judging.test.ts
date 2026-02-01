import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldAudit, shouldBeHoneypot } from '@/lib/judging';

// Mock the dependencies
vi.mock('@/lib/db', () => ({
  default: {
    bot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    judgeVote: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    arenaMatch: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/openai', () => ({
  runBotAsJudge: vi.fn().mockResolvedValue({
    vote: 'a',
    reasoning: 'Test reasoning',
  }),
  runJudgeEvaluation: vi.fn().mockResolvedValue({
    vote: 'a',
    reasoning: 'Test reasoning',
  }),
}));

vi.mock('@/lib/anthropic', () => ({
  runAuditJudge: vi.fn().mockResolvedValue({
    vote: 'a',
    reasoning: 'Audit reasoning',
  }),
}));

describe('Judging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldAudit', () => {
    it('should return boolean', () => {
      const result = shouldAudit();
      expect(typeof result).toBe('boolean');
    });

    it('should audit approximately 10% of matches', () => {
      // Run many trials and check distribution
      let auditCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        if (shouldAudit()) auditCount++;
      }

      // Should be roughly 10% with some variance
      const auditRate = auditCount / trials;
      expect(auditRate).toBeGreaterThan(0.05);
      expect(auditRate).toBeLessThan(0.20);
    });
  });

  describe('shouldBeHoneypot', () => {
    it('should return boolean', () => {
      const result = shouldBeHoneypot();
      expect(typeof result).toBe('boolean');
    });

    it('should create honeypot approximately 5% of matches', () => {
      // Run many trials and check distribution
      let honeypotCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        if (shouldBeHoneypot()) honeypotCount++;
      }

      // Should be roughly 5% with some variance
      const honeypotRate = honeypotCount / trials;
      expect(honeypotRate).toBeGreaterThan(0.02);
      expect(honeypotRate).toBeLessThan(0.12);
    });
  });
});
