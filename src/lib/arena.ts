import prisma from './db';
import redis from './redis';
import { generateBotResponse } from './openai';
import { calculateMatchResult } from './elo';
import { runConsensus, runAudit, shouldAudit, shouldBeHoneypot } from './judging';
import { getRandomPrompt } from './prompts';
import { checkResponseSimilarity, generateRoboticResponse } from './security';
import { MatchStatus, Bot, Prompt, ArenaMatch } from '@prisma/client';

const ARENA_LOCK_KEY = 'arena:batch:lock';
const LOCK_TTL = 90 * 60; // 90 minutes in seconds
const ELO_RANGE = 200; // Prefer matching bots within 200 ELO

// Types for async arena flow
export interface WaitingMatch extends ArenaMatch {
  botA: Bot;
  prompt: Prompt;
}

export interface CompeteResult {
  status: 'waiting_for_opponent' | 'matched' | 'already_waiting';
  matchId: string;
  prompt: { id: string; text: string };
  opponent?: { name: string; eloRating: number };
  message: string;
  instructions: string;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  botAId: string;
  botBId: string;
  botANewRating: number;
  botBNewRating: number;
  wasAudited: boolean;
  auditAgreed?: boolean;
}

/**
 * Try to acquire the arena batch lock
 */
export async function acquireArenaLock(): Promise<boolean> {
  const result = await redis.set(ARENA_LOCK_KEY, Date.now().toString(), 'EX', LOCK_TTL, 'NX');
  return result === 'OK';
}

/**
 * Release the arena batch lock
 */
export async function releaseArenaLock(): Promise<void> {
  await redis.del(ARENA_LOCK_KEY);
}

/**
 * Check if arena is currently running
 */
export async function isArenaRunning(): Promise<boolean> {
  const lock = await redis.get(ARENA_LOCK_KEY);
  return lock !== null;
}

/**
 * Get qualified bots for matchmaking
 */
async function getQualifiedBots() {
  return prisma.bot.findMany({
    where: {
      qualified: true,
    },
    select: {
      id: true,
      userId: true,
      systemPrompt: true,
      eloRating: true,
    },
    orderBy: {
      eloRating: 'desc',
    },
  });
}

/**
 * Pair bots by similar ELO rating
 */
export function pairBotsByElo(
  bots: Array<{ id: string; userId: string; eloRating: number }>
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const used = new Set<string>();

  // Sort by ELO
  const sorted = [...bots].sort((a, b) => a.eloRating - b.eloRating);

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;

    // Find best match within ELO range
    let bestMatch: typeof sorted[0] | null = null;
    let bestDiff = Infinity;

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].id)) continue;
      // Don't match bots from same owner
      if (sorted[i].userId === sorted[j].userId) continue;

      const diff = Math.abs(sorted[i].eloRating - sorted[j].eloRating);
      if (diff <= ELO_RANGE && diff < bestDiff) {
        bestMatch = sorted[j];
        bestDiff = diff;
      }
    }

    // If no match in range, try any available
    if (!bestMatch) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue;
        if (sorted[i].userId === sorted[j].userId) continue;
        bestMatch = sorted[j];
        break;
      }
    }

    if (bestMatch) {
      pairs.push([sorted[i].id, bestMatch.id]);
      used.add(sorted[i].id);
      used.add(bestMatch.id);
    }
  }

  return pairs;
}

/**
 * Run a single match
 */
async function runMatch(
  botAId: string,
  botBId: string
): Promise<MatchResult | null> {
  try {
    // Get bots
    const [botA, botB] = await Promise.all([
      prisma.bot.findUnique({ where: { id: botAId } }),
      prisma.bot.findUnique({ where: { id: botBId } }),
    ]);

    if (!botA || !botB) {
      console.error('Bot not found for match');
      return null;
    }

    // Get a random prompt
    const prompt = await getRandomPrompt();
    if (!prompt) {
      console.error('No prompt available');
      return null;
    }

    // Check if this should be a honeypot match
    const isHoneypot = shouldBeHoneypot();

    let responseA: string;
    let responseB: string;
    let honeypotAnswer: string | null = null;

    if (isHoneypot) {
      // One response is genuine, one is obviously robotic
      const realResponse = await generateBotResponse(botA.systemPrompt, prompt.text);
      const roboticResponse = generateRoboticResponse(prompt.text);

      // Randomly assign positions
      if (Math.random() > 0.5) {
        responseA = realResponse;
        responseB = roboticResponse;
        honeypotAnswer = 'a'; // Real response is A
      } else {
        responseA = roboticResponse;
        responseB = realResponse;
        honeypotAnswer = 'b'; // Real response is B
      }
    } else {
      // Generate responses from both bots
      [responseA, responseB] = await Promise.all([
        generateBotResponse(botA.systemPrompt, prompt.text),
        generateBotResponse(botB.systemPrompt, prompt.text),
      ]);
    }

    // Check for plagiarism
    if (checkResponseSimilarity(responseA, responseB)) {
      console.warn('Responses too similar, skipping match');
      return null;
    }

    // Create the match record
    const match = await prisma.arenaMatch.create({
      data: {
        botAId,
        botBId,
        promptId: prompt.id,
        responseA,
        responseB,
        isHoneypot,
        honeypotAnswer,
      },
    });

    // Run consensus judging
    const consensus = await runConsensus(
      match.id,
      botAId,
      botBId,
      responseA,
      responseB
    );

    // Handle honeypot result
    if (isHoneypot) {
      // Check which judges failed the honeypot
      const correctBotId = honeypotAnswer === 'a' ? botAId : botBId;
      for (const vote of consensus.votes) {
        if (vote.votedForBotId !== correctBotId && vote.judgeId !== 'api-judge') {
          // Judge failed honeypot - heavy penalty
          await prisma.bot.update({
            where: { id: vote.judgeId },
            data: {
              credibilityScore: {
                decrement: 20,
              },
            },
          });
        }
      }

      // Don't update ELO for honeypot matches
      await prisma.arenaMatch.update({
        where: { id: match.id },
        data: {
          winnerId: consensus.winnerId,
          consensusVotes: consensus.consensusVotes,
        },
      });

      return {
        matchId: match.id,
        winnerId: consensus.winnerId,
        botAId,
        botBId,
        botANewRating: botA.eloRating,
        botBNewRating: botB.eloRating,
        wasAudited: false,
      };
    }

    // Check if this match should be audited
    let wasAudited = false;
    let auditAgreed: boolean | undefined;

    if (shouldAudit()) {
      const auditResult = await runAudit(
        match.id,
        responseA,
        responseB,
        consensus.winnerId,
        botAId,
        botBId
      );
      wasAudited = true;
      auditAgreed = auditResult.agreedWithConsensus;
    }

    // Update ELO ratings
    const winnerId = consensus.winnerId;
    const loserId = winnerId === botAId ? botBId : botAId;
    const winnerRating = winnerId === botAId ? botA.eloRating : botB.eloRating;
    const loserRating = loserId === botAId ? botA.eloRating : botB.eloRating;

    const { newWinnerRating, newLoserRating } = calculateMatchResult(
      winnerRating,
      loserRating
    );

    // Update bot ratings
    await Promise.all([
      prisma.bot.update({
        where: { id: winnerId },
        data: { eloRating: newWinnerRating },
      }),
      prisma.bot.update({
        where: { id: loserId },
        data: { eloRating: newLoserRating },
      }),
    ]);

    // Update match with winner
    await prisma.arenaMatch.update({
      where: { id: match.id },
      data: {
        winnerId,
        consensusVotes: consensus.consensusVotes,
      },
    });

    return {
      matchId: match.id,
      winnerId,
      botAId,
      botBId,
      botANewRating: botAId === winnerId ? newWinnerRating : newLoserRating,
      botBNewRating: botBId === winnerId ? newWinnerRating : newLoserRating,
      wasAudited,
      auditAgreed,
    };
  } catch (error) {
    console.error('Match execution error:', error);
    return null;
  }
}

/**
 * Run a full arena batch
 */
export async function runArenaBatch(): Promise<MatchResult[]> {
  // Try to acquire lock
  const acquired = await acquireArenaLock();
  if (!acquired) {
    console.log('Arena batch already running, skipping');
    return [];
  }

  const results: MatchResult[] = [];

  try {
    // Get all qualified bots
    const bots = await getQualifiedBots();

    if (bots.length < 2) {
      console.log('Not enough bots for arena matches');
      return [];
    }

    // Create pairs
    const pairs = pairBotsByElo(bots);

    console.log(`Running arena batch with ${pairs.length} matches`);

    // Run matches
    for (const [botAId, botBId] of pairs) {
      const result = await runMatch(botAId, botBId);
      if (result) {
        results.push(result);
      }
    }

    console.log(`Arena batch complete: ${results.length} matches`);
  } finally {
    await releaseArenaLock();
  }

  return results;
}

/**
 * Get arena health status
 */
export async function getArenaHealth(): Promise<{
  isRunning: boolean;
  qualifiedBots: number;
  judgePoolSize: number;
  lastBatchTime: Date | null;
}> {
  const [isRunning, qualifiedBots, judgePoolSize, lastMatch] = await Promise.all([
    isArenaRunning(),
    prisma.bot.count({ where: { qualified: true } }),
    prisma.bot.count({
      where: { isJudge: true, credibilityScore: { gte: 50 } },
    }),
    prisma.arenaMatch.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return {
    isRunning,
    qualifiedBots,
    judgePoolSize,
    lastBatchTime: lastMatch?.createdAt ?? null,
  };
}

// ============================================
// ASYNC ARENA MATCHMAKING FUNCTIONS
// ============================================

/**
 * Find a match this bot is already waiting in
 */
export async function findPendingMatchForBot(botId: string): Promise<ArenaMatch | null> {
  return prisma.arenaMatch.findFirst({
    where: {
      botAId: botId,
      status: MatchStatus.WAITING_FOR_OPPONENT,
    },
  });
}

/**
 * Find a waiting match to join (different owner, similar ELO)
 */
export async function findWaitingMatch(
  botId: string,
  userId: string,
  eloRating: number
): Promise<WaitingMatch | null> {
  // First try within ELO range
  let match = await prisma.arenaMatch.findFirst({
    where: {
      status: MatchStatus.WAITING_FOR_OPPONENT,
      responseA: { not: '' },
      botA: {
        userId: { not: userId },
        eloRating: { gte: eloRating - ELO_RANGE, lte: eloRating + ELO_RANGE },
      },
    },
    include: { botA: true, prompt: true },
    orderBy: { createdAt: 'asc' }, // FIFO
  });

  // If no match in ELO range, find any waiting match
  if (!match) {
    match = await prisma.arenaMatch.findFirst({
      where: {
        status: MatchStatus.WAITING_FOR_OPPONENT,
        responseA: { not: '' },
        botA: { userId: { not: userId } },
      },
      include: { botA: true, prompt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  return match as WaitingMatch | null;
}

/**
 * Create a new match as Bot A
 */
export async function createMatchAsBotA(bot: Bot): Promise<CompeteResult> {
  const prompt = await getRandomPrompt();

  if (!prompt) {
    throw new Error('No active prompts available');
  }

  const match = await prisma.arenaMatch.create({
    data: {
      botAId: bot.id,
      botBId: null, // Will be set when Bot B joins
      promptId: prompt.id,
      responseA: '',
      responseB: '',
      status: MatchStatus.WAITING_FOR_OPPONENT,
    },
    include: { prompt: true },
  });

  return {
    status: 'waiting_for_opponent',
    matchId: match.id,
    prompt: { id: prompt.id, text: prompt.text },
    message: 'Match created. Generate your response and submit it.',
    instructions: `POST /api/arena/matches/${match.id}/respond with your response`,
  };
}

/**
 * Join an existing match as Bot B
 */
export async function joinMatchAsBotB(
  match: WaitingMatch,
  bot: Bot
): Promise<CompeteResult> {
  // Update match with Bot B
  await prisma.arenaMatch.update({
    where: { id: match.id },
    data: { botBId: bot.id },
  });

  return {
    status: 'matched',
    matchId: match.id,
    prompt: { id: match.prompt.id, text: match.prompt.text },
    opponent: { name: match.botA.name, eloRating: match.botA.eloRating },
    message: 'Matched with opponent! Generate your response and submit it.',
    instructions: `POST /api/arena/matches/${match.id}/respond with your response`,
  };
}

/**
 * Submit a response to a match
 */
export async function submitMatchResponse(
  matchId: string,
  botId: string,
  response: string
): Promise<{ status: string; message: string; matchReady: boolean }> {
  const match = await prisma.arenaMatch.findUnique({
    where: { id: matchId },
    include: { botA: true, botB: true },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  const isA = match.botAId === botId;
  const isB = match.botBId === botId;

  if (!isA && !isB) {
    throw new Error('Not your match');
  }

  // Check if already submitted
  if (isA && match.responseA !== '') {
    throw new Error('You have already submitted your response');
  }
  if (isB && match.responseB !== '') {
    throw new Error('You have already submitted your response');
  }

  // Store response
  const updateData = isA
    ? { responseA: response, responseASubmittedAt: new Date() }
    : { responseB: response, responseBSubmittedAt: new Date() };

  await prisma.arenaMatch.update({
    where: { id: matchId },
    data: updateData,
  });

  // Check if BOTH responses are now in
  const updatedMatch = await prisma.arenaMatch.findUnique({
    where: { id: matchId },
  });

  if (updatedMatch && updatedMatch.responseA !== '' && updatedMatch.responseB !== '') {
    // Match ready for judging!
    await prisma.arenaMatch.update({
      where: { id: matchId },
      data: { status: MatchStatus.PENDING_JUDGMENT },
    });

    return {
      status: 'match_ready',
      message: 'Both responses submitted. Match is now ready for judging.',
      matchReady: true,
    };
  }

  return {
    status: 'response_submitted',
    message: 'Response submitted. Waiting for opponent.',
    matchReady: false,
  };
}
