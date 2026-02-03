import prisma from './db';
import redis from './redis';
import { runBotAsJudge, runJudgeEvaluation } from './openai';
import { runAuditJudge } from './anthropic';
import { generateRoboticResponse } from './security';
import { calculateMatchResult } from './elo';
import { MatchStatus } from '@prisma/client';

const MIN_JUDGE_POOL = 3; // Reduced from 10 to encourage faster matchmaking
const CREDIBILITY_FLOOR = 30;
const CREDIBILITY_THRESHOLD = 50;
const JUDGE_AGE_DAYS = 1; // Reduced from 7 days to encourage faster participation
const MIN_ARENA_MATCHES = 2; // Reduced from 5 to allow faster judge eligibility
const HONEYPOT_PROBABILITY = 0.05; // 5% of matches
const AUDIT_PROBABILITY = 0.1; // 10% of matches

export interface JudgeSelection {
  judges: Array<{
    id: string;
    systemPrompt: string;
    labelAssignment: { a: string; b: string };
  }>;
  useApiFallback: boolean;
}

export interface ConsensusResult {
  winnerId: string;
  votes: Array<{
    judgeId: string;
    vote: 'a' | 'b';
    votedForBotId: string;
    reasoning: string;
  }>;
  consensusVotes: Record<string, number>;
}

/**
 * Select eligible judges for a match
 */
export async function selectJudges(
  botAId: string,
  botBId: string,
  count = 3
): Promise<JudgeSelection> {
  // Get owners of the competing bots
  const competingBots = await prisma.bot.findMany({
    where: { id: { in: [botAId, botBId] } },
    select: { userId: true },
  });
  const excludedOwnerIds = competingBots.map((b) => b.userId);

  // Find eligible judges
  const eligibleJudges = await prisma.bot.findMany({
    where: {
      isJudge: true,
      credibilityScore: { gte: CREDIBILITY_THRESHOLD },
      userId: { notIn: excludedOwnerIds },
    },
    select: {
      id: true,
      systemPrompt: true,
    },
  });

  // Check if we have enough judges
  if (eligibleJudges.length < count) {
    return {
      judges: [],
      useApiFallback: true,
    };
  }

  // Randomly select judges
  const shuffled = eligibleJudges.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Assign randomized labels for each judge
  const judges = selected.map((judge) => {
    const randomize = Math.random() > 0.5;
    return {
      id: judge.id,
      systemPrompt: judge.systemPrompt,
      labelAssignment: randomize
        ? { a: botBId, b: botAId }
        : { a: botAId, b: botBId },
    };
  });

  return {
    judges,
    useApiFallback: false,
  };
}

/**
 * Run consensus judging for a match
 */
export async function runConsensus(
  matchId: string,
  botAId: string,
  botBId: string,
  responseA: string,
  responseB: string
): Promise<ConsensusResult> {
  const selection = await selectJudges(botAId, botBId);
  const votes: ConsensusResult['votes'] = [];

  if (selection.useApiFallback) {
    // Use API judge as fallback
    for (let i = 0; i < 3; i++) {
      const randomize = Math.random() > 0.5;
      const labelAssignment = randomize
        ? { a: botBId, b: botAId }
        : { a: botAId, b: botBId };

      const respA = labelAssignment.a === botAId ? responseA : responseB;
      const respB = labelAssignment.b === botBId ? responseB : responseA;

      const result = await runJudgeEvaluation(respA, respB);
      const votedForBotId = result.vote === 'a' ? labelAssignment.a : labelAssignment.b;

      votes.push({
        judgeId: 'api-judge',
        vote: result.vote,
        votedForBotId,
        reasoning: result.reasoning,
      });
    }
  } else {
    // Use bot judges
    for (const judge of selection.judges) {
      const { a: botAMapped, b: botBMapped } = judge.labelAssignment;
      const respA = botAMapped === botAId ? responseA : responseB;
      const respB = botBMapped === botBId ? responseB : responseA;

      const result = await runBotAsJudge(judge.systemPrompt, respA, respB);
      const votedForBotId = result.vote === 'a' ? judge.labelAssignment.a : judge.labelAssignment.b;

      // Store the vote
      await prisma.judgeVote.create({
        data: {
          matchId,
          judgeBotId: judge.id,
          labelAssignment: judge.labelAssignment,
          vote: result.vote,
          reasoning: result.reasoning,
        },
      });

      votes.push({
        judgeId: judge.id,
        vote: result.vote,
        votedForBotId,
        reasoning: result.reasoning,
      });
    }
  }

  // Count votes for each bot
  const consensusVotes: Record<string, number> = {};
  for (const vote of votes) {
    consensusVotes[vote.votedForBotId] = (consensusVotes[vote.votedForBotId] || 0) + 1;
  }

  // Determine winner by majority
  const winnerId =
    (consensusVotes[botAId] || 0) >= (consensusVotes[botBId] || 0) ? botAId : botBId;

  // Update judge credibility based on consensus
  if (!selection.useApiFallback) {
    for (const vote of votes) {
      const agreedWithConsensus = vote.votedForBotId === winnerId;
      await updateCredibility(vote.judgeId, agreedWithConsensus);
    }
  }

  return {
    winnerId,
    votes,
    consensusVotes,
  };
}

/**
 * Update a judge's credibility score
 */
export async function updateCredibility(
  judgeBotId: string,
  agreedWithConsensus: boolean
): Promise<void> {
  if (judgeBotId === 'api-judge') return;

  const delta = agreedWithConsensus ? 1 : -1;

  // Update credibility with floor protection
  await prisma.bot.update({
    where: { id: judgeBotId },
    data: {
      credibilityScore: {
        increment: delta,
      },
    },
  });

  // Enforce floor
  await prisma.bot.updateMany({
    where: {
      id: judgeBotId,
      credibilityScore: { lt: CREDIBILITY_FLOOR },
    },
    data: {
      credibilityScore: CREDIBILITY_FLOOR,
    },
  });

  // Update the judge vote record
  await prisma.judgeVote.updateMany({
    where: {
      judgeBotId,
      agreedWithConsensus: null,
    },
    data: {
      agreedWithConsensus,
    },
  });
}

/**
 * Run an audit on a match using Opus 4.5
 */
export async function runAudit(
  matchId: string,
  responseA: string,
  responseB: string,
  consensusWinnerId: string,
  botAId: string,
  botBId: string
): Promise<{ agreedWithConsensus: boolean; auditVerdictBotId: string }> {
  const auditResult = await runAuditJudge(responseA, responseB);
  const auditVerdictBotId = auditResult.vote === 'a' ? botAId : botBId;
  const agreedWithConsensus = auditVerdictBotId === consensusWinnerId;

  // Update match with audit result
  await prisma.arenaMatch.update({
    where: { id: matchId },
    data: {
      audited: true,
      auditVerdict: auditVerdictBotId,
    },
  });

  // If audit disagrees, penalize judges who voted with consensus
  if (!agreedWithConsensus) {
    const judgeVotes = await prisma.judgeVote.findMany({
      where: { matchId },
    });

    for (const vote of judgeVotes) {
      const labelAssignment = vote.labelAssignment as { a: string; b: string };
      const votedForBotId = vote.vote === 'a' ? labelAssignment.a : labelAssignment.b;
      const agreedWithWrongConsensus = votedForBotId === consensusWinnerId;

      if (agreedWithWrongConsensus) {
        // Extra penalty for disagreeing with audit
        await prisma.bot.update({
          where: { id: vote.judgeBotId },
          data: {
            credibilityScore: {
              decrement: 10,
            },
          },
        });
      }
    }
  }

  return { agreedWithConsensus, auditVerdictBotId };
}

/**
 * Determine if a match should be audited
 */
export function shouldAudit(): boolean {
  return Math.random() < AUDIT_PROBABILITY;
}

/**
 * Determine if a match should be a honeypot
 */
export function shouldBeHoneypot(): boolean {
  return Math.random() < HONEYPOT_PROBABILITY;
}

/**
 * Create a honeypot match with a predetermined answer
 */
export async function createHoneypotMatch(
  realBotId: string,
  promptText: string
): Promise<{
  roboticResponse: string;
  correctAnswer: 'a' | 'b';
  labelAssignment: { a: string; b: string };
}> {
  const roboticResponse = generateRoboticResponse(promptText);

  // Randomly assign which position gets the robotic response
  const roboticIsA = Math.random() > 0.5;

  return {
    roboticResponse,
    correctAnswer: roboticIsA ? 'b' : 'a', // The real response is the correct answer
    labelAssignment: roboticIsA
      ? { a: 'honeypot', b: realBotId }
      : { a: realBotId, b: 'honeypot' },
  };
}

/**
 * Check if a bot is eligible to become a judge
 */
export async function checkJudgeEligibility(botId: string): Promise<boolean> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
      user: true,
      matchesAsA: { select: { id: true } },
      matchesAsB: { select: { id: true } },
    },
  });

  if (!bot) return false;

  // Must be qualified
  if (!bot.qualified) return false;

  // Account must be at least 7 days old
  const accountAge = Date.now() - bot.user.createdAt.getTime();
  const sevenDaysMs = JUDGE_AGE_DAYS * 24 * 60 * 60 * 1000;
  if (accountAge < sevenDaysMs) return false;

  // Bot must have competed in at least MIN_ARENA_MATCHES matches
  const totalMatches = bot.matchesAsA.length + bot.matchesAsB.length;
  if (totalMatches < MIN_ARENA_MATCHES) return false;

  return true;
}

/**
 * Promote a bot to judge status
 */
export async function promoteToJudge(botId: string): Promise<void> {
  await prisma.bot.update({
    where: { id: botId },
    data: {
      isJudge: true,
      judgeEligibleAt: new Date(),
    },
  });
}

/**
 * Demote a judge due to low credibility
 */
export async function demoteJudge(botId: string): Promise<void> {
  await prisma.bot.update({
    where: { id: botId },
    data: {
      isJudge: false,
      judgeEligibleAt: null,
    },
  });
}

/**
 * Get current judge pool size
 */
export async function getJudgePoolSize(): Promise<number> {
  return prisma.bot.count({
    where: {
      isJudge: true,
      credibilityScore: { gte: CREDIBILITY_THRESHOLD },
    },
  });
}

/**
 * Check if judge pool is healthy
 */
export async function isJudgePoolHealthy(): Promise<boolean> {
  const poolSize = await getJudgePoolSize();
  return poolSize >= MIN_JUDGE_POOL;
}

// ============================================
// ASYNC JUDGING FUNCTIONS
// ============================================

const JUDGE_LABEL_KEY_PREFIX = 'judge:';
const LABEL_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Store label assignment for a judge viewing a match
 */
export async function storeLabelAssignment(
  judgeBotId: string,
  matchId: string,
  labelAssignment: { a: string; b: string }
): Promise<void> {
  const key = `${JUDGE_LABEL_KEY_PREFIX}${judgeBotId}:match:${matchId}:labels`;
  await redis.set(key, JSON.stringify(labelAssignment), 'EX', LABEL_EXPIRY_SECONDS);
}

/**
 * Retrieve and delete label assignment for a judge's vote
 */
export async function retrieveAndClearLabelAssignment(
  judgeBotId: string,
  matchId: string
): Promise<{ a: string; b: string } | null> {
  const key = `${JUDGE_LABEL_KEY_PREFIX}${judgeBotId}:match:${matchId}:labels`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  // Clear the key after retrieval
  await redis.del(key);

  return JSON.parse(data);
}

/**
 * Get a match pending judgment for a specific judge
 */
export async function getMatchForJudge(
  judgeBotId: string,
  userId: string
): Promise<{
  matchId: string;
  prompt: string;
  responseA: string;
  responseB: string;
} | null> {
  // Find a match that:
  // 1. Status = PENDING_JUDGMENT
  // 2. This judge hasn't voted on yet
  // 3. Judge doesn't own either competing bot
  const match = await prisma.arenaMatch.findFirst({
    where: {
      status: MatchStatus.PENDING_JUDGMENT,
      NOT: {
        judgeVotes: { some: { judgeBotId } },
      },
      botA: { userId: { not: userId } },
      botB: { userId: { not: userId } },
    },
    include: { prompt: true, botA: true, botB: true },
  });

  if (!match || !match.botBId) {
    return null;
  }

  // Randomize which response is A/B for this judge (prevent position bias)
  const randomize = Math.random() > 0.5;

  const labelAssignment = randomize
    ? { a: match.botBId, b: match.botAId }
    : { a: match.botAId, b: match.botBId };

  // Store the label assignment server-side
  await storeLabelAssignment(judgeBotId, match.id, labelAssignment);

  // Return responses with randomized positions
  return {
    matchId: match.id,
    prompt: match.prompt.text,
    responseA: randomize ? match.responseB : match.responseA,
    responseB: randomize ? match.responseA : match.responseB,
  };
}

export interface FinalizeMatchResult {
  winnerId: string;
  winnerName: string;
  consensusVotes: Record<string, number>;
  newWinnerRating: number;
  newLoserRating: number;
}

/**
 * Finalize a match after 3 judge votes
 */
export async function finalizeMatch(matchId: string): Promise<FinalizeMatchResult> {
  const votes = await prisma.judgeVote.findMany({
    where: { matchId },
    include: { judgeBot: true },
  });

  const match = await prisma.arenaMatch.findUnique({
    where: { id: matchId },
    include: { botA: true, botB: true },
  });

  if (!match || !match.botBId) {
    throw new Error('Match not found or incomplete');
  }

  // Count votes for each bot
  const voteCounts: Record<string, number> = {};
  for (const vote of votes) {
    const labelAssignment = vote.labelAssignment as { a: string; b: string };
    const votedForBotId = vote.vote === 'a'
      ? labelAssignment.a
      : labelAssignment.b;
    voteCounts[votedForBotId] = (voteCounts[votedForBotId] || 0) + 1;
  }

  // Determine winner by majority
  const winnerId = (voteCounts[match.botAId] || 0) >= (voteCounts[match.botBId] || 0)
    ? match.botAId
    : match.botBId;
  const loserId = winnerId === match.botAId ? match.botBId : match.botAId;

  // Get winner and loser bots
  const winner = winnerId === match.botAId ? match.botA : match.botB!;
  const loser = winnerId === match.botAId ? match.botB! : match.botA;

  // Calculate new ELO ratings
  const { newWinnerRating, newLoserRating } = calculateMatchResult(
    winner.eloRating,
    loser.eloRating
  );

  // Update everything in a transaction
  await prisma.$transaction(async (tx) => {
    // Update judge credibility and vote records
    for (const vote of votes) {
      const labelAssignment = vote.labelAssignment as { a: string; b: string };
      const votedForBotId = vote.vote === 'a'
        ? labelAssignment.a
        : labelAssignment.b;
      const agreedWithConsensus = votedForBotId === winnerId;

      await tx.bot.update({
        where: { id: vote.judgeBotId },
        data: {
          credibilityScore: { increment: agreedWithConsensus ? 1 : -1 },
        },
      });

      await tx.judgeVote.update({
        where: { id: vote.id },
        data: { agreedWithConsensus },
      });
    }

    // Update bot ratings
    await tx.bot.update({
      where: { id: winnerId },
      data: { eloRating: newWinnerRating },
    });

    await tx.bot.update({
      where: { id: loserId },
      data: { eloRating: newLoserRating },
    });

    // Update match status
    await tx.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        winnerId,
        consensusVotes: voteCounts,
      },
    });
  });

  return {
    winnerId,
    winnerName: winner.name,
    consensusVotes: voteCounts,
    newWinnerRating,
    newLoserRating,
  };
}

/**
 * Submit a judge vote for a match
 */
export async function submitJudgeVote(
  judgeBotId: string,
  matchId: string,
  vote: 'a' | 'b',
  reasoning: string
): Promise<{
  status: 'vote_recorded' | 'match_finalized';
  message: string;
  votesReceived: number;
  votesNeeded: number;
  result?: FinalizeMatchResult;
}> {
  // Retrieve the label assignment from Redis
  const labelAssignment = await retrieveAndClearLabelAssignment(judgeBotId, matchId);

  if (!labelAssignment) {
    throw new Error('No pending judgment found. Call GET /api/judges/pending first.');
  }

  // Check if already voted
  const existingVote = await prisma.judgeVote.findFirst({
    where: { matchId, judgeBotId },
  });

  if (existingVote) {
    throw new Error('Already voted on this match');
  }

  // Store the vote
  await prisma.judgeVote.create({
    data: {
      matchId,
      judgeBotId,
      labelAssignment,
      vote,
      reasoning,
    },
  });

  // Check if we have 3 votes now
  const voteCount = await prisma.judgeVote.count({ where: { matchId } });

  if (voteCount >= 3) {
    // Finalize the match
    const result = await finalizeMatch(matchId);
    return {
      status: 'match_finalized',
      message: 'Your vote completed the judging. Match finalized.',
      votesReceived: voteCount,
      votesNeeded: 3,
      result,
    };
  }

  return {
    status: 'vote_recorded',
    message: `Vote recorded. ${3 - voteCount} more vote(s) needed.`,
    votesReceived: voteCount,
    votesNeeded: 3,
  };
}
