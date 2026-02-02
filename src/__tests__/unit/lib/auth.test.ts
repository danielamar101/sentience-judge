import { describe, it, expect } from 'vitest';
import { generateVerificationCode, createToken, verifyToken, extractTwitterHandle } from '@/lib/auth';

describe('Auth', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-character alphanumeric code', () => {
      const code = generateVerificationCode();

      expect(code).toBeDefined();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-F0-9]+$/);
    });

    it('should generate unique codes', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();

      expect(code1).not.toBe(code2);
    });
  });

  describe('createToken', () => {
    it('should create valid JWT with userId and twitterHandle', () => {
      const payload = { userId: 'test-user-id', twitterHandle: 'testuser' };
      const token = createToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const payload = { userId: 'test-user-id', twitterHandle: 'testuser' };
      const token = createToken(payload);

      const result = verifyToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.twitterHandle).toBe(payload.twitterHandle);
      expect(result.iat).toBeDefined();
      expect(result.exp).toBeDefined();
    });

    it('should throw UnauthorizedError for invalid signature', () => {
      const token = 'invalid.token.here';

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });

    it('should throw UnauthorizedError for malformed token', () => {
      const token = 'not-a-valid-jwt';

      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('extractTwitterHandle', () => {
    it('should extract handle from twitter.com URL', () => {
      const url = 'https://twitter.com/elonmusk/status/1234567890';
      expect(extractTwitterHandle(url)).toBe('elonmusk');
    });

    it('should extract handle from x.com URL', () => {
      const url = 'https://x.com/testuser/status/9876543210';
      expect(extractTwitterHandle(url)).toBe('testuser');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/nottwitter';
      expect(extractTwitterHandle(url)).toBeNull();
    });

    it('should handle handles with @ prefix', () => {
      const url = 'https://twitter.com/@someuser/status/123';
      expect(extractTwitterHandle(url)).toBe('someuser');
    });
  });
});
