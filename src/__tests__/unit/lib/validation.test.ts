import { describe, it, expect } from 'vitest';
import {
  verifyTweetSchema,
  loginSchema,
  createBotSchema,
  submitQualificationSchema,
  safeValidate,
} from '@/lib/validation';

describe('Validation', () => {
  describe('verifyTweetSchema', () => {
    it('should pass for valid twitter.com URL and code', () => {
      const result = safeValidate(verifyTweetSchema, {
        tweetUrl: 'https://twitter.com/testuser/status/1234567890',
        code: 'ABC123',
      });

      expect(result.success).toBe(true);
    });

    it('should pass for valid x.com URL and code', () => {
      const result = safeValidate(verifyTweetSchema, {
        tweetUrl: 'https://x.com/testuser/status/1234567890',
        code: 'ABC123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for invalid tweet URL', () => {
      const result = safeValidate(verifyTweetSchema, {
        tweetUrl: 'https://example.com/nottwitter',
        code: 'ABC123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('Twitter/X tweet URL');
      }
    });

    it('should fail for missing code', () => {
      const result = safeValidate(verifyTweetSchema, {
        tweetUrl: 'https://twitter.com/testuser/status/1234567890',
        code: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should pass for valid Twitter handle', () => {
      const result = safeValidate(loginSchema, {
        twitterHandle: 'testuser',
      });

      expect(result.success).toBe(true);
    });

    it('should pass for handle with @ prefix', () => {
      const result = safeValidate(loginSchema, {
        twitterHandle: '@testuser',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for empty handle', () => {
      const result = safeValidate(loginSchema, {
        twitterHandle: '',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for handle longer than 15 characters', () => {
      const result = safeValidate(loginSchema, {
        twitterHandle: 'a'.repeat(16),
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
