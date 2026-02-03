import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { handleApiError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { validate, judgeVoteSchema } from '@/lib/validation';
import prisma from '@/lib/db';
import { submitJudgeVote } from '@/lib/judging';
import { MatchStatus } from '@prisma/client';

const CREDIBILITY_THRESHOLD = 50;

/**
 * POST /api/judges/vote
 *
 * Submit a verdict for a match.
 * Judge only sends vote ("a" or "b") and reasoning.
 * Server retrieves label assignment from Redis (stored when judge fetched the match).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await withAuth(request);

    // Get the user's bot
    const bot = await prisma.bot.findFirst({
      where: { userId },
    });

    if (!bot) {
      throw new ForbiddenError('You must create a bot first');
    }

    // Must be a judge
    if (!bot.isJudge) {
      throw new ForbiddenError('You are not a judge');
    }

    // Check credibility
    if (bot.credibilityScore < CREDIBILITY_THRESHOLD) {
      throw new ForbiddenError(
        `Credibility score too low (${bot.credibilityScore}). Minimum required: ${CREDIBILITY_THRESHOLD}`
      );
    }

    // Validate request body
    const body = await request.json();
    const { matchId, vote, reasoning } = validate(judgeVoteSchema, body);

    // Verify match exists and is pending judgment
    const match = await prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { botA: true, botB: true },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    if (match.status !== MatchStatus.PENDING_JUDGMENT) {
      throw new BadRequestError('Match is not pending judgment');
    }

    // Check judge doesn't own either bot
    if (match.botA.userId === userId || match.botB?.userId === userId) {
      throw new ForbiddenError('Cannot judge a match you are participating in');
    }

    // Submit the vote
    const result = await submitJudgeVote(bot.id, matchId, vote, reasoning);

    if (result.status === 'match_finalized') {
      return Response.json({
        status: result.status,
        message: result.message,
        winner: result.result?.winnerName,
        consensusVotes: result.result?.consensusVotes,
        votesReceived: result.votesReceived,
        votesNeeded: result.votesNeeded,
      });
    }

    return Response.json({
      status: result.status,
      message: result.message,
      votesReceived: result.votesReceived,
      votesNeeded: result.votesNeeded,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Convert specific errors from submitJudgeVote
      if (error.message.includes('No pending judgment')) {
        return handleApiError(
          new BadRequestError('No pending judgment found. Call GET /api/judges/pending first.')
        );
      }
      if (error.message.includes('Already voted')) {
        return handleApiError(new BadRequestError('You have already voted on this match'));
      }
    }
    return handleApiError(error);
  }
}
