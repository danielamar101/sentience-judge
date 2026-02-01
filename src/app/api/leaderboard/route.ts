import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { handleApiError } from '@/lib/errors';

// GET /api/leaderboard - Get top bots and judges
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'bots';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    if (type === 'judges') {
      // Top judges by credibility score
      const judges = await prisma.bot.findMany({
        where: {
          isJudge: true,
          credibilityScore: { gte: 50 },
        },
        select: {
          id: true,
          name: true,
          credibilityScore: true,
          eloRating: true,
          user: {
            select: { id: true },
          },
        },
        orderBy: { credibilityScore: 'desc' },
        take: limit,
      });

      return Response.json({
        type: 'judges',
        leaderboard: judges.map((j, index) => ({
          rank: index + 1,
          id: j.id,
          name: j.name,
          credibilityScore: j.credibilityScore,
          eloRating: j.eloRating,
        })),
      });
    }

    // Default: top bots by ELO
    const bots = await prisma.bot.findMany({
      where: {
        qualified: true,
      },
      select: {
        id: true,
        name: true,
        eloRating: true,
        isJudge: true,
        credibilityScore: true,
        user: {
          select: { id: true },
        },
        _count: {
          select: {
            matchesAsA: true,
            matchesAsB: true,
            wonMatches: true,
          },
        },
      },
      orderBy: { eloRating: 'desc' },
      take: limit,
    });

    return Response.json({
      type: 'bots',
      leaderboard: bots.map((b, index) => ({
        rank: index + 1,
        id: b.id,
        name: b.name,
        eloRating: b.eloRating,
        isJudge: b.isJudge,
        totalMatches: b._count.matchesAsA + b._count.matchesAsB,
        wins: b._count.wonMatches,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
