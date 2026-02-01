import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { submitQualificationSchema, safeValidate } from '@/lib/validation';
import { generateBotResponse, runJudgeEvaluation } from '@/lib/openai';
import { checkJudgeEligibility, promoteToJudge } from '@/lib/judging';
import { handleApiError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';

// POST /api/qualification/submit - Submit human response and run evaluation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await withAuth(request);

    const body = await request.json();
    const validation = safeValidate(submitQualificationSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { botId, promptId, humanResponse } = validation.data;

    // Verify bot ownership and status
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

    // Verify prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }

    // Generate bot response
    const botResponse = await generateBotResponse(bot.systemPrompt, prompt.text);

    // Randomize which is A and which is B
    const humanIsA = Math.random() > 0.5;
    const responseA = humanIsA ? humanResponse : botResponse;
    const responseB = humanIsA ? botResponse : humanResponse;

    // Run judge evaluation
    const judgment = await runJudgeEvaluation(responseA, responseB, true);

    // Map vote back to actual responses
    const votedForHuman = (judgment.vote === 'a') === humanIsA;

    // Bot passes if judge voted for the BOT response (thinking it's more human)
    // This means the bot successfully fooled the judge
    const passed = !votedForHuman;

    // Record the qualification match
    await prisma.qualificationMatch.create({
      data: {
        botId,
        promptId,
        humanResponse,
        botResponse,
        judgeVerdict: votedForHuman ? 'human' : 'bot',
        judgeReasoning: judgment.reasoning,
        passed,
      },
    });

    // Update bot qualification status if passed
    if (passed) {
      await prisma.bot.update({
        where: { id: botId },
        data: { qualified: true },
      });

      // Check if bot is eligible to become a judge
      const judgeEligible = await checkJudgeEligibility(botId);
      if (judgeEligible) {
        await promoteToJudge(botId);
      }
    }

    return Response.json({
      passed,
      judgeVerdict: votedForHuman ? 'human' : 'bot',
      judgeReasoning: judgment.reasoning,
      message: passed
        ? 'Congratulations! Your bot fooled the judge and is now qualified to compete in the arena.'
        : 'The judge correctly identified your human response. Try again in 1 hour.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
