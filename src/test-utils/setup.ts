import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/mirror_arena_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console.error to prevent noisy output during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Filter out expected errors during tests
  const errorString = args[0]?.toString() || '';
  if (
    errorString.includes('Warning:') ||
    errorString.includes('Not implemented')
  ) {
    return;
  }
  originalError.apply(console, args);
};

// Global cleanup
afterEach(() => {
  vi.clearAllMocks();
});
