import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { handleApiError } from '@/lib/errors';

// GET /api/arena/matches - Get recent matches (both arena and qualification) with full details for showcase
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);

    // Fetch arena matches (bot vs bot)
    const arenaMatches = await prisma.arenaMatch.findMany({
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

    // Fetch qualification matches (bot vs human)
    const qualificationMatches = await prisma.qualificationMatch.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        bot: { select: { id: true, name: true } },
        prompt: { select: { text: true, category: true } },
      },
    });

    // Format arena matches
    const formattedArenaMatches = arenaMatches.map((match) => {
      let judgeVotes = match.judgeVotes.map((vote) => ({
        judgeName: vote.judgeBot.name,
        vote: vote.vote,
        reasoning: vote.reasoning,
        agreedWithConsensus: vote.agreedWithConsensus ?? true,
      }));

      // If no judge votes but has consensus (API judges were used), create synthetic votes
      if (judgeVotes.length === 0 && match.consensusVotes) {
        const consensusVotes = match.consensusVotes as Record<string, number>;
        const totalVotes = Object.values(consensusVotes).reduce((sum, v) => sum + v, 0);

        // Create a synthetic judge vote showing the consensus
        if (totalVotes > 0 && match.winnerId) {
          judgeVotes = [{
            judgeName: 'System Prompt',
            vote: 'a', // Placeholder, actual vote determined by winner
            reasoning: `Consensus reached with ${consensusVotes[match.winnerId] || 0} out of ${totalVotes} votes for the winner.`,
            agreedWithConsensus: true,
          }];
        }
      }

      return {
        id: match.id,
        type: 'arena' as const,
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

    // Format qualification matches (bot vs human)
    const formattedQualificationMatches = qualificationMatches.map((match) => {
      // Determine winner based on judgeVerdict
      const botWon = match.judgeVerdict === 'bot';
      const winnerId = botWon ? match.bot.id : 'human';
      const winnerName = botWon ? match.bot.name : 'Human';

      return {
        id: match.id,
        type: 'qualification' as const,
        prompt: {
          text: match.prompt.text,
          category: match.prompt.category,
        },
        botA: match.bot, // The bot
        botB: { id: 'human', name: 'Human' }, // The human
        responseA: match.botResponse,
        responseB: match.humanResponse,
        winnerId,
        winnerName,
        consensusVotes: null,
        judgeVotes: [
          {
            judgeName: 'Judge',
            vote: botWon ? 'a' : 'b',
            reasoning: match.judgeReasoning,
            agreedWithConsensus: true,
          },
        ],
        createdAt: match.createdAt.toISOString(),
      };
    });

    // Combine and sort by date
    const allMatches = [...formattedArenaMatches, ...formattedQualificationMatches]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return Response.json({
      matches: allMatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
