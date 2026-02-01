import { NextRequest } from 'next/server';
import { runArenaBatch, getArenaHealth } from '@/lib/arena';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

// GET /api/arena - Get arena status
export async function GET() {
  try {
    const health = await getArenaHealth();

    return Response.json({
      status: 'ok',
      ...health,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/arena - Trigger arena batch (requires secret key)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedError('Invalid cron secret');
    }

    const results = await runArenaBatch();

    return Response.json({
      message: 'Arena batch completed',
      matchesRun: results.length,
      results: results.map((r) => ({
        matchId: r.matchId,
        winnerId: r.winnerId,
        wasAudited: r.wasAudited,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
