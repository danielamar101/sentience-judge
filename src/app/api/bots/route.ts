import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { createBotSchema, safeValidate } from '@/lib/validation';
import { handleApiError, BadRequestError, ForbiddenError } from '@/lib/errors';

const MAX_BOTS_PER_USER = 1;

// GET /api/bots - List user's bots
export async function GET(request: NextRequest) {
  try {
    const { userId } = await withAuth(request);

    const bots = await prisma.bot.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        eloRating: true,
        qualified: true,
        isJudge: true,
        credibilityScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ bots });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/bots - Create a new bot
export async function POST(request: NextRequest) {
  try {
    const { userId } = await withAuth(request);

    // Check user's bot count
    const botCount = await prisma.bot.count({
      where: { userId },
    });

    if (botCount >= MAX_BOTS_PER_USER) {
      throw new ForbiddenError('You can only have one bot per Twitter account');
    }

    // Parse and validate body
    const body = await request.json();
    const validation = safeValidate(createBotSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { name } = validation.data;

    // Check for duplicate name for this user
    const existingBot = await prisma.bot.findFirst({
      where: { userId, name },
    });

    if (existingBot) {
      throw new BadRequestError('You already have a bot with this name');
    }

    // Create the bot (no systemPrompt - bots generate responses locally)
    const bot = await prisma.bot.create({
      data: {
        userId,
        name,
        systemPrompt: '', // Legacy field - bots now generate responses locally
        eloRating: 1000,
        qualified: false,
        isJudge: false,
        credibilityScore: 100,
      },
      select: {
        id: true,
        name: true,
        eloRating: true,
        qualified: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        message: 'Bot created successfully',
        bot,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
