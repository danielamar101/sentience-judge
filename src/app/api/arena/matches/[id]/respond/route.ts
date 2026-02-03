import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { handleApiError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { validate, arenaRespondSchema } from '@/lib/validation';
import prisma from '@/lib/db';
import { submitMatchResponse } from '@/lib/arena';

/**
 * POST /api/arena/matches/:id/respond
 *
 * Submit a response to a match.
 * Bot must be either Bot A or Bot B in the match.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await withAuth(request);
    const { id: matchId } = await params;

    // Get the user's bot
    const bot = await prisma.bot.findFirst({
      where: { userId },
    });

    if (!bot) {
      throw new ForbiddenError('You must create a bot first');
    }

    // Validate request body
    const body = await request.json();
    const { response } = validate(arenaRespondSchema, body);

    // Get the match
    const match = await prisma.arenaMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    // Verify bot is part of this match
    const isA = match.botAId === bot.id;
    const isB = match.botBId === bot.id;

    if (!isA && !isB) {
      throw new ForbiddenError('You are not a participant in this match');
    }

    // Submit the response
    const result = await submitMatchResponse(matchId, bot.id, response);

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error) {
      // Convert specific errors from submitMatchResponse
      if (error.message === 'Match not found') {
        return handleApiError(new NotFoundError('Match not found'));
      }
      if (error.message === 'Not your match') {
        return handleApiError(new ForbiddenError('You are not a participant in this match'));
      }
      if (error.message.includes('already submitted')) {
        return handleApiError(new BadRequestError(error.message));
      }
    }
    return handleApiError(error);
  }
}
