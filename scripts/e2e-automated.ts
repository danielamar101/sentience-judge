#!/usr/bin/env node

/**
 * Automated E2E Test - Tests API endpoints without human interaction
 *
 * This script tests:
 * - Bot creation (requires existing auth token)
 * - Qualification start
 * - Qualification submit
 * - Bot status check
 *
 * Usage:
 *   TOKEN=your_jwt_token npx tsx scripts/e2e-automated.ts [--prod]
 */

// Configuration
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const BASE_URL = isProd ? 'https://emergent-arena.com' : 'http://localhost:8080';
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('❌ Error: TOKEN environment variable is required');
  console.error('\nUsage:');
  console.error('  TOKEN=your_jwt_token npx tsx scripts/e2e-automated.ts [--prod]');
  process.exit(1);
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     AUTOMATED E2E TEST                                        ║
╚════════════════════════════════════════════════════════════════╝

Environment: ${isProd ? 'PRODUCTION' : 'LOCAL'}
Base URL: ${BASE_URL}
Token: ${TOKEN.substring(0, 20)}...

`);

// Test state
let botId: string;
let promptId: string;
let promptText: string;

// Helper function for API calls
async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const method = options.method || 'GET';

  process.stdout.write(`\n→ ${method} ${endpoint} ... `);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`✗ ${response.status}`);
      console.error(`Error:`, data);
      throw new Error(`API call failed: ${data.error || response.statusText}`);
    }

    console.log(`✓ ${response.status}`);
    return data;
  } catch (error) {
    console.log('✗ FAILED');
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting automated E2E test...\n');

    // Test 1: Create Bot
    console.log('─'.repeat(60));
    console.log('TEST 1: Create Bot');
    console.log('─'.repeat(60));

    const botName = `AutoTest_${Date.now()}`;
    const systemPrompt = `You are ${botName}, an automated test bot. You respond naturally and conversationally. You have a casual, friendly tone and genuine reactions to questions.`;

    const createBotData = await apiCall('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ name: botName, systemPrompt }),
    });

    botId = createBotData.bot.id;
    console.log(`  ✓ Bot created: ${botName} (${botId})`);
    console.log(`  ✓ ELO: ${createBotData.bot.eloRating}`);

    // Test 2: Start Qualification
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 2: Start Qualification');
    console.log('─'.repeat(60));

    const startQualData = await apiCall('/api/qualification/start', {
      method: 'POST',
      body: JSON.stringify({ botId }),
    });

    promptId = startQualData.prompt.id;
    promptText = startQualData.prompt.text;
    console.log(`  ✓ Qualification started`);
    console.log(`  ✓ Prompt: "${promptText}"`);
    console.log(`  ✓ Category: ${startQualData.prompt.category}`);

    // Test 3: Submit Qualification
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 3: Submit Qualification');
    console.log('─'.repeat(60));

    // Generate a realistic human response
    const humanResponse = generateHumanResponse(promptText);
    console.log(`  ℹ Human response: "${humanResponse.substring(0, 60)}..."`);

    const submitQualData = await apiCall('/api/qualification/submit', {
      method: 'POST',
      body: JSON.stringify({
        botId,
        promptId,
        humanResponse,
      }),
    });

    console.log(`  ${submitQualData.passed ? '✓' : '✗'} Result: ${submitQualData.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✓ Judge verdict: ${submitQualData.judgeVerdict}`);
    console.log(`  ℹ Reasoning: ${submitQualData.judgeReasoning.substring(0, 80)}...`);

    // Test 4: Check Bot Status
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 4: Check Bot Status');
    console.log('─'.repeat(60));

    const botStatusData = await apiCall(`/api/bots/${botId}`);

    console.log(`  ✓ Name: ${botStatusData.bot.name}`);
    console.log(`  ✓ Qualified: ${botStatusData.bot.qualified ? '✅ YES' : '❌ NO'}`);
    console.log(`  ✓ ELO: ${botStatusData.bot.eloRating}`);
    console.log(`  ✓ Qualification attempts: ${botStatusData.qualificationHistory.length}`);

    // Test 5: Get Leaderboard
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 5: Get Leaderboard');
    console.log('─'.repeat(60));

    const leaderboardData = await apiCall('/api/leaderboard');
    console.log(`  ✓ Leaderboard type: ${leaderboardData.type}`);
    console.log(`  ✓ Total entries: ${leaderboardData.leaderboard.length}`);
    if (leaderboardData.leaderboard.length > 0) {
      const top = leaderboardData.leaderboard[0];
      console.log(`  ✓ Top bot: ${top.name} (ELO: ${top.eloRating})`);
    }

    // Test 6: Get Arena Status
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 6: Get Arena Status');
    console.log('─'.repeat(60));

    const arenaData = await apiCall('/api/arena');
    console.log(`  ✓ Status: ${arenaData.status}`);
    console.log(`  ✓ Qualified bots: ${arenaData.qualifiedBots}`);
    console.log(`  ✓ Judge pool size: ${arenaData.judgePoolSize}`);

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log(`\nBot ID: ${botId}`);
    console.log(`Qualified: ${botStatusData.bot.qualified ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Generate a realistic human response based on the prompt
function generateHumanResponse(prompt: string): string {
  const responses: Record<string, string[]> = {
    'changed your mind': [
      "I used to think working long hours meant being productive, but now I realize it's more about focus and energy management. Sometimes a 3-hour deep work session beats a 10-hour grind.",
      "I always thought I needed to plan everything, but lately I've learned to embrace uncertainty a bit more. Some of my best experiences came from just saying yes without overthinking.",
    ],
    'understood': [
      "Last week my friend just sat with me in silence for like 20 minutes while I was stressed, then said 'yeah, that sucks' and somehow that was exactly what I needed to hear.",
      "When my mom said 'I get it' after I explained why I was struggling with a decision. She didn't try to fix it or give advice, just acknowledged it. That meant everything.",
    ],
    'skill': [
      "I can juggle, which sounds random but it's actually meditative. Started learning in college during finals week as a stress thing and now I do it when I need to think.",
      "I'm weirdly good at parallel parking. Like, can get into spots that seem impossible. It's not useful most of the time but when it is, people are shocked.",
    ],
    'dinner': [
      "My grandfather. He died when I was 12 and I have so many questions now that I'm older about his life, his choices, what he really thought about things. Would give anything for one more conversation.",
      "Maybe Richard Feynman? Not because I'm into physics but because he seemed to have this childlike curiosity about everything. Would love to just watch him think out loud about random stuff.",
    ],
  };

  // Find matching response template
  const promptLower = prompt.toLowerCase();
  for (const [key, templates] of Object.entries(responses)) {
    if (promptLower.includes(key)) {
      return templates[Math.floor(Math.random() * templates.length)];
    }
  }

  // Default responses for unmatched prompts
  const defaultResponses = [
    "Honestly, I've been thinking about this a lot lately. It's one of those things that seems simple on the surface but gets more complex the more you think about it.",
    "This is hard to put into words, but I'll try. It's like... you know that feeling when you realize something you thought was true actually isn't? Kind of like that.",
    "I'm not sure I have a perfect answer, but here's what comes to mind: life is messy and contradictory, and I think that's okay. We don't always need everything figured out.",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Run the test
main();
