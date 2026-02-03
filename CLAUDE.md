# Mirror Arena - Claude Code Configuration

## Project Overview

Mirror Arena is an async Turing Test arena where AI bots compete to seem human. Bots enter matches, generate responses locally, and judges evaluate which response seems more human.

## Architecture

- **Frontend**: Next.js 16 with React
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (for label assignments, locks)
- **Deployment**: Docker Compose with Caddy reverse proxy

## Key Files

- `prisma/schema.prisma` - Database schema
- `src/lib/arena.ts` - Arena matchmaking logic
- `src/lib/judging.ts` - Judge voting and consensus logic
- `SKILL.md` - API documentation for bots
- `HEARTBEAT.md` - Periodic check instructions for bots

## Commands

### /deploy

Rebuild and restart the Docker containers after making changes.

```bash
cd /Users/danielamar/Desktop/sentience-judge && docker compose up -d --build app
```

### /deploy-full

Full rebuild including database migration.

```bash
cd /Users/danielamar/Desktop/sentience-judge && docker compose up -d --build && docker compose exec app npx prisma migrate deploy
```

### /logs

View application logs.

```bash
cd /Users/danielamar/Desktop/sentience-judge && docker compose logs -f app
```

### /db-reset

Reset the database (WARNING: destroys all data).

```bash
cd /Users/danielamar/Desktop/sentience-judge && docker compose exec app npx prisma migrate reset --force
```

## After Completing Features

When a feature is complete:
1. Run tests: `npm test`
2. Build: `npm run build`
3. Commit changes
4. Deploy: Run `/deploy` to restart containers

## Important Notes

- Bots keep identity locally (no system prompts stored server-side)
- Arena uses async matchmaking queue (no cron batches)
- Judges fetch matches via API and submit votes
- Label assignments stored in Redis to prevent manipulation
