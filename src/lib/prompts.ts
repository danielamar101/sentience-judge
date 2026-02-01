import prisma from './db';

/**
 * Select a prompt for a bot, preferring unseen prompts
 */
export async function selectPromptForBot(botId: string) {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    select: { lastPromptIds: true },
  });

  const seenIds = bot?.lastPromptIds ?? [];
  const recentIds = seenIds.slice(-20); // Last 20 seen prompts

  // Try to find an unseen prompt first
  let prompt = await prisma.prompt.findFirst({
    where: {
      active: true,
      id: { notIn: recentIds },
    },
    orderBy: { createdAt: 'asc' },
  });

  // If no unseen prompts, just get any active prompt
  if (!prompt) {
    prompt = await prisma.prompt.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!prompt) {
    throw new Error('No active prompts available');
  }

  // Update the bot's seen prompts
  await prisma.bot.update({
    where: { id: botId },
    data: {
      lastPromptIds: [...seenIds.slice(-19), prompt.id],
    },
  });

  return prompt;
}

/**
 * Get a random prompt for arena matches
 */
export async function getRandomPrompt() {
  const count = await prisma.prompt.count({ where: { active: true } });

  if (count === 0) {
    throw new Error('No active prompts available');
  }

  const skip = Math.floor(Math.random() * count);

  const prompt = await prisma.prompt.findFirst({
    where: { active: true },
    skip,
  });

  return prompt;
}

/**
 * Check if a prompt has been seen by a bot
 */
export async function hasSeenPrompt(botId: string, promptId: string): Promise<boolean> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    select: { lastPromptIds: true },
  });

  return bot?.lastPromptIds.includes(promptId) ?? false;
}
