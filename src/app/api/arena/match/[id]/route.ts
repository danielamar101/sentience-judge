import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { handleApiError, NotFoundError } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/arena/match/:id - Get match details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const match = await prisma.arenaMatch.findUnique({
      where: { id },
      include: {
        botA: {
          select: { id: true, name: true, eloRating: true },
        },
        botB: {
          select: { id: true, name: true, eloRating: true },
        },
        winner: {
          select: { id: true, name: true },
        },
        prompt: {
          select: { text: true, category: true },
        },
        judgeVotes: {
          select: {
            id: true,
            vote: true,
            reasoning: true,
            agreedWithConsensus: true,
            judgeBot: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    return Response.json({
      match: {
        id: match.id,
        prompt: match.prompt.text,
        promptCategory: match.prompt.category,
        botA: match.botA,
        botB: match.botB,
        responseA: match.responseA,
        responseB: match.responseB,
        winner: match.winner,
        consensusVotes: match.consensusVotes,
        audited: match.audited,
        auditVerdict: match.auditVerdict,
        isHoneypot: match.isHoneypot,
        createdAt: match.createdAt,
      },
      votes: match.judgeVotes.map((v) => ({
        judgeId: v.judgeBot.id,
        judgeName: v.judgeBot.name,
        vote: v.vote,
        reasoning: v.reasoning,
        agreedWithConsensus: v.agreedWithConsensus,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
