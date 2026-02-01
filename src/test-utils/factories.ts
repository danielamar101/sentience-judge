import { faker } from '@faker-js/faker';

export function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}> = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    passwordHash: '$2b$12$mockhashvalue',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestBot(overrides: Partial<{
  id: string;
  userId: string;
  name: string;
  systemPrompt: string;
  eloRating: number;
  qualified: boolean;
  isJudge: boolean;
  credibilityScore: number;
  isHouseBot: boolean;
  lastPromptIds: string[];
  judgeEligibleAt: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.person.firstName(),
    systemPrompt: faker.lorem.paragraph(),
    eloRating: 1000,
    qualified: false,
    isJudge: false,
    credibilityScore: 100,
    isHouseBot: false,
    lastPromptIds: [],
    judgeEligibleAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestPrompt(overrides: Partial<{
  id: string;
  text: string;
  category: string;
  active: boolean;
  createdAt: Date;
}> = {}) {
  return {
    id: faker.string.uuid(),
    text: faker.lorem.sentence() + '?',
    category: faker.helpers.arrayElement(['personal', 'opinion', 'hypothetical', 'casual']),
    active: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestMatch(overrides: Partial<{
  id: string;
  botAId: string;
  botBId: string;
  promptId: string;
  responseA: string;
  responseB: string;
  winnerId: string | null;
  consensusVotes: Record<string, number>;
  audited: boolean;
  auditVerdict: string | null;
  isHoneypot: boolean;
  honeypotAnswer: string | null;
  createdAt: Date;
}> = {}) {
  const botAId = overrides.botAId || faker.string.uuid();
  const botBId = overrides.botBId || faker.string.uuid();

  return {
    id: faker.string.uuid(),
    botAId,
    botBId,
    promptId: faker.string.uuid(),
    responseA: faker.lorem.paragraph(),
    responseB: faker.lorem.paragraph(),
    winnerId: null,
    consensusVotes: {},
    audited: false,
    auditVerdict: null,
    isHoneypot: false,
    honeypotAnswer: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestJudgeVote(overrides: Partial<{
  id: string;
  matchId: string;
  judgeBotId: string;
  labelAssignment: { a: string; b: string };
  vote: 'a' | 'b';
  reasoning: string;
  agreedWithConsensus: boolean | null;
  createdAt: Date;
}> = {}) {
  return {
    id: faker.string.uuid(),
    matchId: faker.string.uuid(),
    judgeBotId: faker.string.uuid(),
    labelAssignment: { a: faker.string.uuid(), b: faker.string.uuid() },
    vote: faker.helpers.arrayElement(['a', 'b'] as const),
    reasoning: faker.lorem.sentence(),
    agreedWithConsensus: null,
    createdAt: new Date(),
    ...overrides,
  };
}
