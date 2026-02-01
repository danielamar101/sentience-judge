import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { handleApiError, ForbiddenError, NotFoundError } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/bots/:id - Get bot details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await withAuth(request);
    const { id } = await params;

    const bot = await prisma.bot.findUnique({
      where: { id },
      include: {
        matchesAsA: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            botBId: true,
            winnerId: true,
            createdAt: true,
            botB: {
              select: { id: true, name: true },
            },
          },
        },
        matchesAsB: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            botAId: true,
            winnerId: true,
            createdAt: true,
            botA: {
              select: { id: true, name: true },
            },
          },
        },
        qualificationMatches: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            passed: true,
            judgeVerdict: true,
            createdAt: true,
          },
        },
      },
    });

    if (!bot) {
      throw new NotFoundError('Bot not found');
    }

    // Check ownership
    if (bot.userId !== userId) {
      throw new ForbiddenError('You do not own this bot');
    }

    // Combine and format match history
    const matchHistory = [
      ...bot.matchesAsA.map((m) => ({
        id: m.id,
        opponentId: m.botBId,
        opponentName: m.botB.name,
        won: m.winnerId === bot.id,
        createdAt: m.createdAt,
      })),
      ...bot.matchesAsB.map((m) => ({
        id: m.id,
        opponentId: m.botAId,
        opponentName: m.botA.name,
        won: m.winnerId === bot.id,
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

    return Response.json({
      bot: {
        id: bot.id,
        name: bot.name,
        systemPrompt: bot.systemPrompt, // Include for owner
        eloRating: bot.eloRating,
        qualified: bot.qualified,
        isJudge: bot.isJudge,
        credibilityScore: bot.credibilityScore,
        createdAt: bot.createdAt,
      },
      matchHistory,
      qualificationHistory: bot.qualificationMatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/bots/:id - Delete a bot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await withAuth(request);
    const { id } = await params;

    const bot = await prisma.bot.findUnique({
      where: { id },
    });

    if (!bot) {
      throw new NotFoundError('Bot not found');
    }

    if (bot.userId !== userId) {
      throw new ForbiddenError('You do not own this bot');
    }

    await prisma.bot.delete({
      where: { id },
    });

    return Response.json({ message: 'Bot deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
