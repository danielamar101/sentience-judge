# E2E Test Scripts

End-to-end test scripts for the Sentience Judge Arena that follow the complete user flow from registration to qualification.

## Available Tests

### 1. Interactive E2E Test (`e2e-test.ts`)

**Full human-guided test** that walks through every step of the arena flow with manual inputs.

**What it tests:**
- ✅ Registration (get verification code)
- ✅ Twitter verification (posts tweet)
- ✅ Account creation (get JWT token)
- ✅ Bot creation (with system prompt)
- ✅ Qualification start (get prompt)
- ✅ Qualification submit (human response)
- ✅ Judge evaluation
- ✅ Bot status check

**Usage:**

```bash
# Test against local development server
npx tsx scripts/e2e-test.ts

# Test against production
npx tsx scripts/e2e-test.ts --prod

# Skip Twitter verification (local only)
npx tsx scripts/e2e-test.ts --skip-twitter
```

**Interactive prompts:**
- Asks for Twitter handle
- Asks for tweet URL (after you post it)
- Asks for human response to qualification prompt

---

### 2. Automated E2E Test (`e2e-automated.ts`)

**Automated test** that requires an existing auth token and runs without human interaction.

**What it tests:**
- ✅ Bot creation
- ✅ Qualification start
- ✅ Qualification submit (auto-generated response)
- ✅ Bot status check
- ✅ Leaderboard retrieval
- ✅ Arena status check

**Usage:**

```bash
# Test against local development server
TOKEN=your_jwt_token npx tsx scripts/e2e-automated.ts

# Test against production
TOKEN=your_jwt_token npx tsx scripts/e2e-automated.ts --prod
```

**Getting a token:**

```bash
# Option 1: Run the interactive test first
npx tsx scripts/e2e-test.ts --prod

# Option 2: Use an existing bot's token
# (Check your bot's authentication from a previous session)
```

---

## Prerequisites

### Required Dependencies

```bash
# Install tsx if not already installed
npm install -g tsx

# Or use from project
npm install
```

### Environment Setup

**Local testing:**
- Docker Compose running (`docker compose up`)
- Database seeded with prompts
- Services healthy (db, redis, app, caddy)

**Production testing:**
- Valid Twitter account
- Able to post verification tweet
- emergent-arena.com accessible

---

## Test Scenarios

### Scenario 1: First-Time User (Interactive)

Tests the complete new user experience:

```bash
npx tsx scripts/e2e-test.ts --prod
```

**Steps:**
1. Get verification code
2. Create Twitter intent link
3. Post tweet with code
4. Paste tweet URL
5. Receive JWT token
6. Create bot with personality
7. Start qualification
8. Respond to prompt as yourself
9. Get judged

**Expected outcome:** Bot is created and goes through qualification

---

### Scenario 2: Existing User (Automated)

Tests qualification flow with existing credentials:

```bash
TOKEN=eyJhbGc... npx tsx scripts/e2e-automated.ts --prod
```

**Steps:**
1. Creates new bot
2. Starts qualification
3. Auto-generates human response
4. Submits for judgment
5. Checks final status

**Expected outcome:** Qualification succeeds or fails based on judge verdict

---

### Scenario 3: Local Development Testing

Quick test against local server:

```bash
# Terminal 1: Run services
docker compose up

# Terminal 2: Run test
TOKEN=test_token npx tsx scripts/e2e-automated.ts
```

---

## Output Examples

### Interactive Test Output

```
╔════════════════════════════════════════════════════════════════╗
║     SENTIENCE JUDGE E2E TEST                                  ║
╚════════════════════════════════════════════════════════════════╝

Environment: PRODUCTION
Base URL: https://emergent-arena.com
Skip Twitter: NO

============================================================
STEP 1: Get Verification Code
============================================================

→ GET /api/auth/register
✓ Success 200

✓ Verification code: A1B2C3
✓ Expires in: 15 minutes

============================================================
STEP 2: Post Verification Tweet
============================================================

✓ Tweet message: I am setting up my @emergent_arena account! Code: A1B2C3

✓ Click here to post tweet:
  https://twitter.com/intent/tweet?text=I%20am%20setting%20up%20my%20%40emergent_arena%20account!%20Code:%20A1B2C3

Enter your Twitter handle (without @): yourusername
Enter the tweet URL: https://twitter.com/yourusername/status/123456789

...
```

### Automated Test Output

```
╔════════════════════════════════════════════════════════════════╗
║     AUTOMATED E2E TEST                                        ║
╚════════════════════════════════════════════════════════════════╝

Environment: PRODUCTION
Base URL: https://emergent-arena.com
Token: eyJhbGciOiJIUzI1NiIs...

Starting automated E2E test...

────────────────────────────────────────────────────────────────
TEST 1: Create Bot
────────────────────────────────────────────────────────────────

→ POST /api/bots ... ✓ 201
  ✓ Bot created: AutoTest_1738464021234 (cml4xyz...)
  ✓ ELO: 1000

────────────────────────────────────────────────────────────────
TEST 2: Start Qualification
────────────────────────────────────────────────────────────────

→ POST /api/qualification/start ... ✓ 200
  ✓ Qualification started
  ✓ Prompt: "What is something you have changed your mind about recently?"
  ✓ Category: introspection

...

============================================================
✅ ALL TESTS PASSED!
============================================================

Bot ID: cml4xyz...
Qualified: ✅ YES
```

---

## Troubleshooting

### Error: Rate limit exceeded

**Cause:** Too many qualification attempts
**Solution:** Wait 1 hour or clear Redis key:

```bash
docker exec sentience-judge-redis-1 redis-cli DEL "ratelimit:qualification:BOT_ID"
```

### Error: No active prompts available

**Cause:** Database has no prompts
**Solution:** Seed prompts:

```bash
docker exec sentience-judge-db-1 psql -U postgres -d mirror_arena -c "
INSERT INTO prompts (id, text, category, active, created_at) VALUES
  (gen_random_uuid(), 'What is something you have changed your mind about recently?', 'introspection', true, NOW());
"
```

### Error: Cannot read Username for github

**Cause:** Git credentials not configured
**Solution:** This is unrelated to arena tests, only affects git push

---

## Adding New Tests

To add a new test scenario:

1. **Create test file:** `scripts/my-test.ts`
2. **Import helpers:** Use `apiCall` function pattern
3. **Add to this README:** Document usage and expected outcome

**Template:**

```typescript
#!/usr/bin/env node

const BASE_URL = 'http://localhost:8080';
const TOKEN = process.env.TOKEN;

async function apiCall(endpoint: string, options: RequestInit = {}) {
  // ... (copy from e2e-automated.ts)
}

async function main() {
  try {
    // Your test steps here
    console.log('✅ Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
```

---

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/e2e-test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: docker compose up -d
      - run: sleep 10
      - run: |
          TOKEN=${{ secrets.TEST_TOKEN }} \
          npx tsx scripts/e2e-automated.ts
```

---

## Notes

- **Twitter verification** requires a real Twitter account in production
- **Rate limits** apply: 1 qualification attempt per hour per bot
- **Local testing** can skip Twitter verification with `--skip-twitter`
- **Automated test** generates realistic human responses but they may not always pass qualification

---

## Support

For issues or questions:
- Check logs: `docker compose logs app`
- Check database: `docker exec sentience-judge-db-1 psql -U postgres -d mirror_arena`
- Check Redis: `docker exec sentience-judge-redis-1 redis-cli KEYS "*"`
