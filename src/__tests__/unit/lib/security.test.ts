import { describe, it, expect } from 'vitest';
import {
  getResponseFingerprint,
  checkResponseSimilarity,
  generateRoboticResponse,
  areIPsInSameCluster,
  areEmailsSameDomain,
} from '@/lib/security';

describe('Security', () => {
  describe('getResponseFingerprint', () => {
    it('should generate consistent fingerprint for same content', () => {
      const response = 'This is a test response.';
      const fp1 = getResponseFingerprint(response);
      const fp2 = getResponseFingerprint(response);

      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different content', () => {
      const fp1 = getResponseFingerprint('This is response one.');
      const fp2 = getResponseFingerprint('This is response two.');

      expect(fp1).not.toBe(fp2);
    });

    it('should normalize case', () => {
      const fp1 = getResponseFingerprint('Hello World');
      const fp2 = getResponseFingerprint('hello world');

      expect(fp1).toBe(fp2);
    });

    it('should ignore punctuation', () => {
      const fp1 = getResponseFingerprint('Hello, World!');
      const fp2 = getResponseFingerprint('Hello World');

      expect(fp1).toBe(fp2);
    });
  });

  describe('checkResponseSimilarity', () => {
    it('should return true for identical responses', () => {
      const response = 'This is a test response.';
      const result = checkResponseSimilarity(response, response);

      expect(result).toBe(true);
    });

    it('should return true for responses with same words in different order', () => {
      const response1 = 'The quick brown fox jumps.';
      const response2 = 'Fox brown quick the jumps.';
      const result = checkResponseSimilarity(response1, response2);

      expect(result).toBe(true);
    });

    it('should return false for different responses', () => {
      const response1 = 'This is about cats.';
      const response2 = 'This is about dogs.';
      const result = checkResponseSimilarity(response1, response2);

      expect(result).toBe(false);
    });
  });

  describe('generateRoboticResponse', () => {
    it('should generate a robotic-sounding response', () => {
      const response = generateRoboticResponse('What is your favorite color?');

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should contain formal language patterns', () => {
      const response = generateRoboticResponse('Tell me about yourself.');

      // Should contain robotic phrases
      const roboticPhrases = [
        'happy to',
        'assist',
        'help',
        'inquiry',
        'provide',
        'AI',
        'designed',
      ];

      const containsRoboticPhrase = roboticPhrases.some((phrase) =>
        response.toLowerCase().includes(phrase.toLowerCase())
      );

      expect(containsRoboticPhrase).toBe(true);
    });
  });

  describe('areIPsInSameCluster', () => {
    it('should return true for IPs in same /24 subnet', () => {
      const result = areIPsInSameCluster('192.168.1.100', '192.168.1.200');
      expect(result).toBe(true);
    });

    it('should return false for IPs in different /24 subnets', () => {
      const result = areIPsInSameCluster('192.168.1.100', '192.168.2.100');
      expect(result).toBe(false);
    });

    it('should return false for completely different IPs', () => {
      const result = areIPsInSameCluster('192.168.1.100', '10.0.0.1');
      expect(result).toBe(false);
    });

    it('should return false for invalid IP addresses', () => {
      const result = areIPsInSameCluster('invalid', 'also-invalid');
      expect(result).toBe(false);
    });
  });

  describe('areEmailsSameDomain', () => {
    it('should return true for emails with same domain', () => {
      const result = areEmailsSameDomain('user1@example.com', 'user2@example.com');
      expect(result).toBe(true);
    });

    it('should return false for emails with different domains', () => {
      const result = areEmailsSameDomain('user@example.com', 'user@other.com');
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = areEmailsSameDomain('user@Example.COM', 'user@example.com');
      expect(result).toBe(true);
    });

    it('should return false for invalid emails', () => {
      const result = areEmailsSameDomain('not-an-email', 'also-not-an-email');
      expect(result).toBe(false);
    });
  });
});
