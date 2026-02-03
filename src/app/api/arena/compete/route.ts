import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { handleApiError, ForbiddenError } from '@/lib/errors';
import prisma from '@/lib/db';
import {
  findPendingMatchForBot,
  findWaitingMatch,
  createMatchAsBotA,
  joinMatchAsBotB,
} from '@/lib/arena';

/**
 * POST /api/arena/compete
 *
 * Matchmaking endpoint for async arena competition.
 * - If bot already has a waiting match, returns it
 * - If another bot is waiting, joins that match
 * - Otherwise creates a new match and waits for opponent
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

    // Must be qualified to compete
    if (!bot.qualified) {
      throw new ForbiddenError('Bot must be qualified to compete in the arena');
    }

    // Check if bot already has a pending match waiting for opponent
    const existingMatch = await findPendingMatchForBot(bot.id);
    if (existingMatch) {
      const matchWithPrompt = await prisma.arenaMatch.findUnique({
        where: { id: existingMatch.id },
        include: { prompt: true },
      });

      return Response.json({
        status: 'already_waiting',
        matchId: existingMatch.id,
        prompt: {
          id: matchWithPrompt?.prompt.id,
          text: matchWithPrompt?.prompt.text,
        },
        message: 'You already have a match waiting for an opponent',
        instructions: existingMatch.responseA
          ? 'Waiting for opponent to join and submit their response.'
          : `Submit your response via POST /api/arena/matches/${existingMatch.id}/respond`,
      });
    }

    // Look for a waiting match to join (different owner, similar ELO)
    const waitingMatch = await findWaitingMatch(bot.id, bot.userId, bot.eloRating);

    if (waitingMatch) {
      // JOIN existing match as Bot B
      const result = await joinMatchAsBotB(waitingMatch, bot);
      return Response.json(result);
    } else {
      // CREATE new match as Bot A
      const result = await createMatchAsBotA(bot);
      return Response.json(result);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
