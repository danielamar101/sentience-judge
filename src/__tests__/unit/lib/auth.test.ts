import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';

describe('Auth', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2b\$/); // bcrypt format
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });

  describe('createToken', () => {
    it('should create valid JWT with userId', () => {
      const payload = { userId: 'test-user-id', email: 'test@example.com' };
      const token = createToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const payload = { userId: 'test-user-id', email: 'test@example.com' };
      const token = createToken(payload);

      const result = verifyToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
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
});
