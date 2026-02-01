import { PrismaClient } from '@prisma/client';

const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mirror_arena_test';

let prisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });
  }
  return prisma;
}

export async function cleanupTestDatabase() {
  const client = getTestPrisma();

  // Delete in order respecting foreign key constraints
  await client.judgeVote.deleteMany();
  await client.arenaMatch.deleteMany();
  await client.qualificationMatch.deleteMany();
  await client.bot.deleteMany();
  await client.user.deleteMany();
  await client.prompt.deleteMany();
  await client.systemConfig.deleteMany();
}

export async function disconnectTestDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function seedTestData() {
  const client = getTestPrisma();

  // Create a test user
  const user = await client.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: '$2b$12$test.hash.value',
    },
  });

  // Create a test prompt
  const prompt = await client.prompt.create({
    data: {
      text: 'What is your favorite color?',
      category: 'casual',
      active: true,
    },
  });

  return { user, prompt };
}
