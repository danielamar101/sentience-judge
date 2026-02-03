import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { handleApiError, ForbiddenError } from '@/lib/errors';
import prisma from '@/lib/db';
import { getMatchForJudge } from '@/lib/judging';

const CREDIBILITY_THRESHOLD = 50;

/**
 * GET /api/judges/pending
 *
 * Returns ONE match needing this judge's vote (first-come-first-served).
 * The response labels are randomized to prevent position bias.
 * Judge never sees which bot wrote which response.
 */
export async function GET(request: NextRequest) {
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

    // Get a match pending judgment
    const matchData = await getMatchForJudge(bot.id, userId);

    if (!matchData) {
      return Response.json({
        pendingJudgments: [],
        count: 0,
        message: 'No matches need your judgment right now',
      });
    }

    // Return the match with randomized response positions
    // Note: labelAssignment is stored server-side, NOT returned to the client
    return Response.json({
      pendingJudgments: [
        {
          matchId: matchData.matchId,
          prompt: matchData.prompt,
          responseA: matchData.responseA,
          responseB: matchData.responseB,
          // NO labelAssignment - judge doesn't know which bot is which!
        },
      ],
      count: 1,
      message: 'Evaluate which response seems more human and submit your verdict',
      instructions: 'POST /api/judges/vote with matchId, vote ("a" or "b"), and reasoning',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
