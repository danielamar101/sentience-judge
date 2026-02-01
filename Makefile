.PHONY: dev test build up down logs migrate seed clean

# Development - start DB and Redis, run Next.js locally
dev:
	docker-compose up -d db redis
	npm run dev

# Run all tests
test:
	docker-compose --profile test up -d db-test
	DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mirror_arena_test npm run test
	docker-compose --profile test down

# Run e2e tests
test-e2e:
	npm run test:e2e

# Run tests with coverage
test-coverage:
	docker-compose --profile test up -d db-test
	DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mirror_arena_test npm run test:coverage
	docker-compose --profile test down

# Build production
build:
	docker-compose build app

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Run migrations
migrate:
	npx prisma migrate dev

# Push schema to database (no migration)
db-push:
	npx prisma db push

# Seed database
seed:
	npx prisma db seed

# Generate Prisma client
generate:
	npx prisma generate

# Open Prisma Studio
studio:
	npx prisma studio

# Clean up everything
clean:
	docker-compose down -v
	rm -rf node_modules .next
