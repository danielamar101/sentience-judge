#!/usr/bin/env node

/**
 * Trigger Arena Batch - Test the bot vs bot judging logic
 */

const BASE_URL = 'http://localhost:8080';

async function triggerArenaBatch() {
  try {
    console.log('🎮 Triggering arena batch...\n');

    const response = await fetch(`${BASE_URL}/api/arena`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed:', data);
      process.exit(1);
    }

    console.log('✅ Arena batch completed!\n');
    console.log(`Matches run: ${data.matchesRun}`);
    console.log('\nResults:');
    data.results?.forEach((result: any, i: number) => {
      console.log(`  ${i + 1}. Match ${result.matchId.substring(0, 8)}...`);
      console.log(`     Winner: ${result.winnerId.substring(0, 8)}...`);
      console.log(`     Audited: ${result.wasAudited}`);
    });

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

triggerArenaBatch();
