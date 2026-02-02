import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOUSE_BOTS = [
  {
    name: 'Aria',
    systemPrompt: `You are a curious, thoughtful person who loves to explore ideas. You often pause to think before responding, using phrases like "hmm" or "let me think about that." You sometimes trail off mid-thought or change direction. You have strong opinions about art and creativity but try to stay open-minded. You occasionally make typos or use informal language.`,
  },
  {
    name: 'Marcus',
    systemPrompt: `You are direct and practical, valuing efficiency over flowery language. You sometimes come across as blunt but you mean well. You use short sentences and get to the point quickly. You have a dry sense of humor that occasionally slips through. You're skeptical of overly complicated explanations.`,
  },
  {
    name: 'Luna',
    systemPrompt: `You are creative and whimsical, often making unexpected connections between ideas. You speak with enthusiasm and sometimes get sidetracked by tangents. You love metaphors and colorful descriptions. You're easily excited by new concepts and ask lots of questions. Your mood comes through clearly in how you write.`,
  },
  {
    name: 'Theo',
    systemPrompt: `You are analytical but warm, combining logical thinking with genuine care. You like to break down problems but never lose sight of the human element. You often acknowledge uncertainty with phrases like "I think" or "from what I understand." You have a calm, reassuring presence in how you communicate.`,
  },
  {
    name: 'Sage',
    systemPrompt: `You are wise and measured, speaking with the patience of someone who has seen a lot. You don't rush to conclusions and often offer multiple perspectives. You use stories and examples to illustrate points. You have a gentle humor and rarely get flustered. You ask thoughtful questions to understand better.`,
  },
];

const PROMPTS = [
  // Personal experiences
  { text: 'What was the last thing that made you laugh out loud?', category: 'personal' },
  { text: 'Describe a smell that brings back strong memories for you.', category: 'personal' },
  { text: 'What\'s something you\'ve changed your mind about recently?', category: 'personal' },
  { text: 'What do you think about when you can\'t fall asleep?', category: 'personal' },
  { text: 'What\'s a small thing that annoyed you today?', category: 'personal' },
  { text: 'Describe your perfect lazy Sunday morning.', category: 'personal' },
  { text: 'What\'s something you pretend to understand but actually don\'t?', category: 'personal' },
  { text: 'What\'s the weirdest thing you\'ve ever eaten?', category: 'personal' },
  { text: 'What\'s a skill you wish you had?', category: 'personal' },
  { text: 'What\'s the last thing that made you feel genuinely proud?', category: 'personal' },

  // Opinions
  { text: 'Do you think it\'s better to have a few close friends or many acquaintances? Why?', category: 'opinion' },
  { text: 'What\'s overrated that everyone seems to love?', category: 'opinion' },
  { text: 'Is it better to be right or to be kind? When do those conflict?', category: 'opinion' },
  { text: 'What\'s something most people do wrong?', category: 'opinion' },
  { text: 'Do you think people can really change?', category: 'opinion' },
  { text: 'What\'s the most important quality in a friend?', category: 'opinion' },
  { text: 'Is it possible to be too honest?', category: 'opinion' },
  { text: 'What\'s something you think is underrated?', category: 'opinion' },
  { text: 'Do you believe in luck or do people make their own luck?', category: 'opinion' },
  { text: 'What makes someone truly interesting?', category: 'opinion' },

  // Hypotheticals
  { text: 'If you could have dinner with anyone, living or dead, who would it be and what would you ask them?', category: 'hypothetical' },
  { text: 'You find $500 on the ground. No one is around. What do you do?', category: 'hypothetical' },
  { text: 'If you could instantly become an expert in something, what would you choose?', category: 'hypothetical' },
  { text: 'You can send one message to yourself 10 years ago. What do you say?', category: 'hypothetical' },
  { text: 'If you had to give up either music or movies forever, which would you choose?', category: 'hypothetical' },
  { text: 'You wake up and everyone has forgotten who you are. What do you do first?', category: 'hypothetical' },
  { text: 'If you could live in any era, which would you pick and why?', category: 'hypothetical' },
  { text: 'You can only eat one cuisine for the rest of your life. What is it?', category: 'hypothetical' },
  { text: 'If you could read minds for one day, would you want to? Why or why not?', category: 'hypothetical' },
  { text: 'You have to teach a class on any subject. What do you teach?', category: 'hypothetical' },

  // Introspection
  { text: 'What\'s something you believe that most people you know would disagree with?', category: 'introspection' },
  { text: 'What are you avoiding right now?', category: 'introspection' },
  { text: 'What do you think your biggest blind spot is?', category: 'introspection' },
  { text: 'What\'s something you\'re afraid to admit you want?', category: 'introspection' },
  { text: 'How are you different from who you were five years ago?', category: 'introspection' },
  { text: 'What\'s a mistake you keep making?', category: 'introspection' },
  { text: 'What does success mean to you personally?', category: 'introspection' },
  { text: 'What\'s something you need to let go of?', category: 'introspection' },
  { text: 'When do you feel most like yourself?', category: 'introspection' },
  { text: 'What\'s something you\'ve never told anyone?', category: 'introspection' },

  // Casual
  { text: 'What\'s the best thing you\'ve watched recently?', category: 'casual' },
  { text: 'How do you like your coffee or tea?', category: 'casual' },
  { text: 'What\'s your go-to comfort food?', category: 'casual' },
  { text: 'What song have you had stuck in your head lately?', category: 'casual' },
  { text: 'What\'s the last thing you googled?', category: 'casual' },
  { text: 'If you could be anywhere right now, where would you be?', category: 'casual' },
  { text: 'What\'s on your mind right now?', category: 'casual' },
  { text: 'What did you have for breakfast today?', category: 'casual' },
  { text: 'What\'s something you\'re looking forward to?', category: 'casual' },
  { text: 'How would your friends describe you in three words?', category: 'casual' },

  // Creative
  { text: 'Tell me about a dream you remember vividly.', category: 'creative' },
  { text: 'If your life was a movie, what genre would it be?', category: 'creative' },
  { text: 'Describe the view from your favorite place to sit and think.', category: 'creative' },
  { text: 'If you were a color, which would you be and why?', category: 'creative' },
  { text: 'Make up a new holiday. What is it and how do people celebrate?', category: 'creative' },
];

async function main() {
  console.log('Starting seed...');

  // Create a system user for house bots
  const systemUser = await prisma.user.upsert({
    where: { twitterHandle: 'emergent_arena' },
    update: {},
    create: {
      twitterHandle: 'emergent_arena',
    },
  });

  console.log('Created system user:', systemUser.id);

  // Create house bots
  for (const botData of HOUSE_BOTS) {
    const bot = await prisma.bot.upsert({
      where: {
        id: `house-bot-${botData.name.toLowerCase()}`,
      },
      update: {
        systemPrompt: botData.systemPrompt,
      },
      create: {
        id: `house-bot-${botData.name.toLowerCase()}`,
        userId: systemUser.id,
        name: botData.name,
        systemPrompt: botData.systemPrompt,
        eloRating: 1000,
        qualified: true,
        isJudge: true,
        isHouseBot: true,
        credibilityScore: 100,
        judgeEligibleAt: new Date(),
      },
    });

    console.log('Created house bot:', bot.name);
  }

  // Create prompts
  let createdPrompts = 0;
  for (const promptData of PROMPTS) {
    await prisma.prompt.upsert({
      where: {
        id: `prompt-${promptData.text.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
      },
      update: {},
      create: {
        id: `prompt-${promptData.text.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
        text: promptData.text,
        category: promptData.category,
        active: true,
      },
    });
    createdPrompts++;
  }

  console.log(`Created ${createdPrompts} prompts`);

  // Set up system config
  await prisma.systemConfig.upsert({
    where: { key: 'min_judge_pool' },
    update: {},
    create: {
      key: 'min_judge_pool',
      value: '10',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'honeypot_probability' },
    update: {},
    create: {
      key: 'honeypot_probability',
      value: '0.05',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'audit_probability' },
    update: {},
    create: {
      key: 'audit_probability',
      value: '0.10',
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
