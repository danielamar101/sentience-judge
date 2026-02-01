import { vi } from 'vitest';

export const mockAnthropic = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            vote: 'a',
            reasoning: 'Response A demonstrates more natural language patterns.',
          }),
        },
      ],
    }),
  },
};

export function setupAnthropicMock() {
  return mockAnthropic;
}

export function resetAnthropicMock() {
  mockAnthropic.messages.create.mockReset();
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));
