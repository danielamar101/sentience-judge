import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createBotSchema,
  submitQualificationSchema,
  safeValidate,
} from '@/lib/validation';

describe('Validation', () => {
  describe('registerSchema', () => {
    it('should pass for valid email and password', () => {
      const result = safeValidate(registerSchema, {
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for invalid email', () => {
      const result = safeValidate(registerSchema, {
        email: 'not-an-email',
        password: 'Password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Invalid email address');
      }
    });

    it('should fail for short password', () => {
      const result = safeValidate(registerSchema, {
        email: 'test@example.com',
        password: 'short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('8 characters');
      }
    });

    it('should fail for password without uppercase', () => {
      const result = safeValidate(registerSchema, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('uppercase');
      }
    });

    it('should fail for password without lowercase', () => {
      const result = safeValidate(registerSchema, {
        email: 'test@example.com',
        password: 'PASSWORD123',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for password without number', () => {
      const result = safeValidate(registerSchema, {
        email: 'test@example.com',
        password: 'Passwordabc',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should pass for valid email and password', () => {
      const result = safeValidate(loginSchema, {
        email: 'test@example.com',
        password: 'anypassword',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for empty password', () => {
      const result = safeValidate(loginSchema, {
        email: 'test@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createBotSchema', () => {
    it('should pass for valid name and prompt', () => {
      const result = safeValidate(createBotSchema, {
        name: 'MyBot',
        systemPrompt: 'You are a helpful assistant with a friendly personality.',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for name with special characters', () => {
      const result = safeValidate(createBotSchema, {
        name: 'My@Bot!',
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for name too long', () => {
      const result = safeValidate(createBotSchema, {
        name: 'a'.repeat(51),
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for prompt too short', () => {
      const result = safeValidate(createBotSchema, {
        name: 'MyBot',
        systemPrompt: 'Short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('10 characters');
      }
    });

    it('should fail for prompt too long', () => {
      const result = safeValidate(createBotSchema, {
        name: 'MyBot',
        systemPrompt: 'a'.repeat(2001),
      });

      expect(result.success).toBe(false);
    });

    it('should allow spaces, hyphens, and underscores in name', () => {
      const result = safeValidate(createBotSchema, {
        name: 'My Bot-Name_Here',
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('submitQualificationSchema', () => {
    it('should pass for valid input', () => {
      const result = safeValidate(submitQualificationSchema, {
        botId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        promptId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        humanResponse: 'This is my human response to the prompt.',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for invalid bot ID', () => {
      const result = safeValidate(submitQualificationSchema, {
        botId: 'invalid-id',
        promptId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        humanResponse: 'This is my response.',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for empty response', () => {
      const result = safeValidate(submitQualificationSchema, {
        botId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        promptId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        humanResponse: '',
      });

      expect(result.success).toBe(false);
    });
  });
});
