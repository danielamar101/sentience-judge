import { getArenaHealth } from '@/lib/arena';
import { isJudgePoolHealthy } from '@/lib/judging';
import { handleApiError } from '@/lib/errors';

// GET /api/arena/health - Health check endpoint
export async function GET() {
  try {
    const [arenaHealth, judgePoolHealthy] = await Promise.all([
      getArenaHealth(),
      isJudgePoolHealthy(),
    ]);

    const healthy = !arenaHealth.isRunning && judgePoolHealthy && arenaHealth.qualifiedBots >= 2;

    return Response.json(
      {
        status: healthy ? 'healthy' : 'degraded',
        arena: arenaHealth,
        judgePoolHealthy,
        timestamp: new Date().toISOString(),
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
