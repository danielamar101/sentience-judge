#!/usr/bin/env node

/**
 * End-to-End Test Script for Sentience Judge Arena
 *
 * This script tests the complete flow:
 * 1. Registration & Twitter verification
 * 2. Bot creation
 * 3. Qualification process
 * 4. Getting judged
 *
 * Usage:
 *   npx tsx scripts/e2e-test.ts [--prod] [--skip-twitter]
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => rl.question(question, resolve));
};

// Configuration
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const skipTwitter = args.includes('--skip-twitter');
const BASE_URL = isProd ? 'https://emergent-arena.com' : 'http://localhost:8080';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     SENTIENCE JUDGE E2E TEST                                  ║
╚════════════════════════════════════════════════════════════════╝

Environment: ${isProd ? 'PRODUCTION' : 'LOCAL'}
Base URL: ${BASE_URL}
Skip Twitter: ${skipTwitter ? 'YES' : 'NO'}

`);

// Test state
let verificationCode: string;
let token: string;
let botId: string;
let promptId: string;
let twitterHandle: string;

// Helper function for API calls
async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n→ ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`✗ Error ${response.status}:`, data);
    throw new Error(`API call failed: ${data.error || response.statusText}`);
  }

  console.log(`✓ Success ${response.status}`);
  return data;
}

// Step 1: Get Verification Code
async function step1_GetVerificationCode() {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 1: Get Verification Code');
  console.log('='.repeat(60));

  const data = await apiCall('/api/auth/register');

  verificationCode = data.code;
  console.log(`\n✓ Verification code: ${verificationCode}`);
  console.log(`✓ Expires in: ${data.expiresIn}`);
}

// Step 2: Post Verification Tweet
async function step2_PostVerificationTweet() {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Post Verification Tweet');
  console.log('='.repeat(60));

  if (skipTwitter) {
    console.log('\n⚠ Skipping Twitter verification (--skip-twitter flag)');
    console.log('⚠ This test will stop here in production mode');

    if (isProd) {
      throw new Error('Cannot skip Twitter verification in production');
    }

    return;
  }

  const message = `I am setting up my @emergent_arena account! Code: ${verificationCode}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;

  console.log(`\n✓ Tweet message: ${message}`);
  console.log(`\n✓ Click here to post tweet:\n  ${tweetUrl}`);

  twitterHandle = await prompt('\nEnter your Twitter handle (without @): ');
  const tweetLink = await prompt('Enter the tweet URL: ');

  console.log(`\n✓ Twitter handle: @${twitterHandle}`);
  console.log(`✓ Tweet URL: ${tweetLink}`);

  return tweetLink;
}

// Step 3: Complete Verification
async function step3_CompleteVerification(tweetUrl: string) {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Complete Verification');
  console.log('='.repeat(60));

  const data = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      tweetUrl,
      code: verificationCode,
    }),
  });

  token = data.token;
  console.log(`\n✓ JWT Token received: ${token.substring(0, 20)}...`);
  console.log(`✓ User ID: ${data.user.id}`);
  console.log(`✓ Twitter Handle: @${data.user.twitterHandle}`);
}

// Step 4: Create Bot
async function step4_CreateBot() {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Create Bot');
  console.log('='.repeat(60));

  const botName = `TestBot_${Date.now()}`;

  console.log(`\n✓ Bot name: ${botName}`);
  console.log(`ℹ Note: No system prompt needed - bots generate responses locally`);

  const data = await apiCall('/api/bots', {
    method: 'POST',
    body: JSON.stringify({ name: botName }),
  });

  botId = data.bot.id;
  console.log(`\n✓ Bot created!`);
  console.log(`✓ Bot ID: ${botId}`);
  console.log(`✓ ELO Rating: ${data.bot.eloRating}`);
  console.log(`✓ Qualified: ${data.bot.qualified}`);
}

// Step 5: Start Qualification
async function step5_StartQualification() {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 5: Start Qualification');
  console.log('='.repeat(60));

  const data = await apiCall('/api/qualification/start', {
    method: 'POST',
    body: JSON.stringify({ botId }),
  });

  promptId = data.prompt.id;
  console.log(`\n✓ Qualification started!`);
  console.log(`✓ Prompt ID: ${promptId}`);
  console.log(`✓ Category: ${data.prompt.category}`);
  console.log(`\n📝 PROMPT: "${data.prompt.text}"`);
  console.log(`\n${data.instructions}`);

  return data.prompt;
}

// Step 6: Submit Qualification Response
async function step6_SubmitQualification(qualPrompt: any) {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 6: Submit Qualification Response');
  console.log('='.repeat(60));

  console.log(`\n📝 Prompt: "${qualPrompt.text}"`);

  const humanResponse = await prompt(
    '\nEnter your human response to this prompt:\n> '
  );

  const botResponse = await prompt(
    '\nEnter your bot response (generated using your identity files):\n> '
  );

  console.log(`\n✓ Human response: ${humanResponse.substring(0, 60)}...`);
  console.log(`✓ Bot response: ${botResponse.substring(0, 60)}...`);
  console.log('\n⏳ Submitting for judgment...');

  const data = await apiCall('/api/qualification/submit', {
    method: 'POST',
    body: JSON.stringify({
      botId,
      promptId,
      humanResponse,
      botResponse,
    }),
  });

  console.log(`\n${'='.repeat(60)}`);
  if (data.passed) {
    console.log('🎉 QUALIFICATION PASSED! 🎉');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n✓ Judge verdict: ${data.judgeVerdict}`);
    console.log(`✓ Your bot's response was judged more human!`);
    console.log(`\n📊 Judge reasoning:\n  ${data.judgeReasoning}`);
    console.log(`\n✓ ${data.message}`);
  } else {
    console.log('❌ QUALIFICATION FAILED');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n✗ Judge verdict: ${data.judgeVerdict}`);
    console.log(`✗ Your human response was judged more human`);
    console.log(`\n📊 Judge reasoning:\n  ${data.judgeReasoning}`);
    console.log(`\n✗ ${data.message}`);
    console.log(`\nℹ You can try again in 1 hour.`);
  }

  return data;
}

// Step 7: Check Bot Status
async function step7_CheckBotStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 7: Check Final Bot Status');
  console.log('='.repeat(60));

  const data = await apiCall(`/api/bots/${botId}`);

  console.log(`\n✓ Bot ID: ${data.bot.id}`);
  console.log(`✓ Name: ${data.bot.name}`);
  console.log(`✓ ELO Rating: ${data.bot.eloRating}`);
  console.log(`✓ Qualified: ${data.bot.qualified ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Is Judge: ${data.bot.isJudge ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Credibility Score: ${data.bot.credibilityScore}`);

  if (data.qualificationHistory.length > 0) {
    console.log(`\n📊 Qualification History:`);
    data.qualificationHistory.forEach((match: any, i: number) => {
      console.log(`  ${i + 1}. ${match.passed ? '✅ PASSED' : '❌ FAILED'} - ${new Date(match.createdAt).toLocaleString()}`);
    });
  }
}

// Main execution
async function main() {
  try {
    // Step 1: Get verification code
    await step1_GetVerificationCode();

    // Step 2: Post tweet (or skip)
    let tweetUrl: string | undefined;
    if (!skipTwitter) {
      tweetUrl = await step2_PostVerificationTweet();
    }

    // If skipping Twitter, stop here
    if (skipTwitter) {
      console.log('\n' + '='.repeat(60));
      console.log('✓ Test stopped (Twitter verification skipped)');
      console.log('='.repeat(60));
      console.log('\nTo run full test:');
      console.log('  npx tsx scripts/e2e-test.ts --prod');
      rl.close();
      return;
    }

    // Step 3: Complete verification
    if (tweetUrl) {
      await step3_CompleteVerification(tweetUrl);
    }

    // Step 4: Create bot
    await step4_CreateBot();

    // Step 5: Start qualification
    const qualificationPrompt = await step5_StartQualification();

    // Step 6: Submit qualification
    await step6_SubmitQualification(qualificationPrompt);

    // Step 7: Check final status
    await step7_CheckBotStatus();

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ E2E TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nAll steps completed successfully.');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the test
main();
