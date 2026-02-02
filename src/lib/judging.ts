import prisma from './db';
import { runBotAsJudge, runJudgeEvaluation } from './openai';
import { runAuditJudge } from './anthropic';
import { generateRoboticResponse } from './security';

const MIN_JUDGE_POOL = 10;
const CREDIBILITY_FLOOR = 30;
const CREDIBILITY_THRESHOLD = 50;
const JUDGE_AGE_DAYS = 7;
const MIN_ARENA_MATCHES = 5; // Bot must have competed in at least 5 arena matches
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
