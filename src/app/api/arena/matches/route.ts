import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { handleApiError } from '@/lib/errors';

// GET /api/arena/matches - Get recent matches with full details for showcase
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);

    const matches = await prisma.arenaMatch.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        winnerId: { not: null }, // Only show matches with a winner
      },
      include: {
        botA: { select: { id: true, name: true } },
        botB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
        prompt: { select: { text: true, category: true } },
        judgeVotes: {
          include: {
            judgeBot: { select: { name: true } },
          },
        },
      },
    });

    const formattedMatches = matches.map((match) => {
      const judgeVotes = match.judgeVotes.map((vote) => ({
        judgeName: vote.judgeBot.name,
        vote: vote.vote,
        reasoning: vote.reasoning,
        agreedWithConsensus: vote.agreedWithConsensus ?? true,
      }));

      return {
        id: match.id,
        prompt: {
          text: match.prompt.text,
          category: match.prompt.category,
        },
        botA: match.botA,
        botB: match.botB,
        responseA: match.responseA,
        responseB: match.responseB,
        winnerId: match.winnerId,
        winnerName: match.winner?.name || null,
        consensusVotes: match.consensusVotes as Record<string, number> | null,
        judgeVotes,
        createdAt: match.createdAt.toISOString(),
      };
    });

    return Response.json({
      matches: formattedMatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
