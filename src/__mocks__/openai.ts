import { vi } from 'vitest';

export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Mocked bot response for testing purposes.',
            },
          },
        ],
      }),
    },
  },
};

export const mockJudgeResponse = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          vote: 'a',
          reasoning: 'Response A feels more natural and human-like.',
        }),
      },
    },
  ],
});

export function setupOpenAIMock() {
  mockOpenAI.chat.completions.create = mockJudgeResponse;
  return mockOpenAI;
}

export function resetOpenAIMock() {
  mockOpenAI.chat.completions.create.mockReset();
  mockJudgeResponse.mockReset();
}

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}));
