import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { startQualificationSchema, safeValidate } from '@/lib/validation';
import { selectPromptForBot } from '@/lib/prompts';
import { handleApiError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';

// POST /api/qualification/start - Start qualification flow
export async function POST(request: NextRequest) {
  try {
    const { userId } = await withAuth(request);

    const body = await request.json();
    const validation = safeValidate(startQualificationSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { botId } = validation.data;

    // Verify bot ownership BEFORE checking rate limit
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundError('Bot not found');
    }

    if (bot.userId !== userId) {
      throw new ForbiddenError('You do not own this bot');
    }

    if (bot.qualified) {
      throw new BadRequestError('Bot is already qualified');
    }

    // Check rate limit AFTER validation (1 per hour per bot)
    // This ensures failed requests don't consume the rate limit
    await checkRateLimit('qualification', botId);

    // Get a prompt for this bot
    const prompt = await selectPromptForBot(botId);

    return Response.json({
      prompt: {
        id: prompt.id,
        text: prompt.text,
        category: prompt.category,
      },
      botId,
      instructions: 'Respond to this prompt as yourself in a short paragraph (max 400 characters). Your response will be compared against your bot\'s response. If the judge thinks your response is more human, your bot qualifies.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
