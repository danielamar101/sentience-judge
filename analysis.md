# Security Analysis Report

**Repository:** sentience-judge (Mirror Arena)
**Date:** 2026-02-01
**Analyzed by:** Automated Security Audit

---

## Executive Summary

This security analysis examined the Mirror Arena codebase for secret leakage, database exposure, and general security vulnerabilities. The codebase demonstrates **good security practices overall**, with proper use of environment variables for sensitive credentials and input validation. However, several issues require attention before production deployment.

---

## Findings by Severity

### CRITICAL

#### 1. Hardcoded Database Credentials in docker-compose.yml
**Location:** `docker-compose.yml:38-40`
```yaml
environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  POSTGRES_DB: mirror_arena
```

**Risk:** The PostgreSQL credentials are hardcoded and committed to version control. While the database is not exposed externally (only accessible within the Docker network), this is a security anti-pattern.

**Recommendation:** Use environment variables for database credentials:
```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:-postgres}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB:-mirror_arena}
```

---

### HIGH

#### 2. Fallback JWT Secret in Code
**Location:** `src/lib/auth.ts:7`
```typescript
secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
```

**Risk:** If `JWT_SECRET` is not set, the application falls back to a weak, predictable secret. This could allow attackers to forge valid JWT tokens.

**Recommendation:** Fail fast if JWT_SECRET is not set in production:
```typescript
const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
```

#### 3. Unprotected Arena Batch Endpoint
**Location:** `src/app/api/arena/route.ts:24-28`
```typescript
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  throw new UnauthorizedError('Invalid cron secret');
}
```

**Risk:** The arena batch endpoint only checks for CRON_SECRET if it's defined. If CRON_SECRET is not set, **anyone can trigger arena batches**, potentially causing resource exhaustion or manipulation.

**Recommendation:** Always require authentication:
```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  throw new UnauthorizedError('Invalid or missing cron secret');
}
```

#### 4. Rate Limiter Fails Open
**Location:** `src/lib/ratelimit.ts:41-47`
```typescript
} catch (error) {
  if (error instanceof RateLimitError) {
    throw error;
  }
  // If Redis is down, log and continue (fail open)
  console.warn('Rate limit check failed:', error);
}
```

**Risk:** If Redis is unavailable, rate limiting is bypassed entirely. This could allow brute force attacks or abuse during Redis outages.

**Recommendation:** Consider failing closed for sensitive endpoints:
```typescript
if (limiterKey === 'login' || limiterKey === 'register') {
  throw new RateLimitError('Service temporarily unavailable');
}
```

---

### MEDIUM

#### 5. Placeholder API Keys During Build
**Location:** `src/lib/anthropic.ts:15`, `src/lib/openai.ts:15`
```typescript
return new Anthropic({ apiKey: 'placeholder-for-build' });
```

**Risk:** While necessary for build time, these placeholders could accidentally be used at runtime if environment variables are misconfigured.

**Recommendation:** Add runtime checks before API calls:
```typescript
if (apiKey === 'placeholder-for-build') {
  throw new Error('API key not configured');
}
```

#### 6. Verbose Error Logging
**Location:** Multiple files (see list below)
```
src/lib/errors.ts:56 - console.error('API Error:', error);
src/lib/openai.ts:57 - console.error('OpenAI API error:', error);
src/lib/anthropic.ts:104 - console.error('Anthropic audit error:', error);
```

**Risk:** Detailed error logging could expose sensitive information (stack traces, API responses, user data) in production logs.

**Recommendation:** Use structured logging with sensitive data redaction:
```typescript
console.error('API Error:', {
  code: error.code,
  message: error.message,
  // Omit stack traces and full error objects in production
});
```

#### 7. Twitter Verification Not Implemented
**Location:** `src/app/api/auth/login/route.ts:43-47`
```typescript
// TODO: In production, you would actually fetch the tweet and verify:
// 1. The tweet exists
// 2. The tweet contains the verification code
// 3. The tweet is from the claimed handle
// For now, we trust the URL format validation
```

**Risk:** Users can claim any Twitter handle by providing a fake tweet URL. This bypasses the intended authentication mechanism.

**Recommendation:** Implement actual Twitter API verification before production launch.

---

### LOW

#### 8. Test Database Credentials
**Location:** `src/test-utils/db.ts:3`
```typescript
const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mirror_arena_test';
```

**Risk:** Hardcoded test database credentials. Low risk as this is only used in test environments.

**Recommendation:** Document that test credentials should never match production.

---

## Positive Security Findings

### Properly Implemented

1. **Environment Variables for Secrets**
   - `.env` is properly listed in `.gitignore`
   - API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY) use environment variables
   - Only `.env.example` with placeholder values is committed

2. **Input Validation**
   - Zod schemas validate all user input (`src/lib/validation.ts`)
   - CUID validation for IDs prevents injection attacks
   - URL regex validation for Twitter URLs

3. **SQL Injection Prevention**
   - Prisma ORM used exclusively for database access
   - No raw SQL queries found

4. **Authentication & Authorization**
   - JWT tokens with proper algorithm specification (HS256)
   - Token expiration (7 days)
   - Ownership checks on all bot/user resources

5. **Rate Limiting**
   - Implemented on sensitive endpoints (login, register, bot creation)
   - Different limits for different actions

6. **Error Handling**
   - Custom error classes with appropriate HTTP status codes
   - Internal errors not exposed to users (returns generic "Internal server error")

7. **Docker Security**
   - Non-root user in production container (`nextjs:nodejs`)
   - Multi-stage build reduces attack surface

8. **No Exposed Secrets in Git History**
   - Searched git history for API keys (`sk-`), passwords, and secrets
   - No real credentials found in any commit

---

## Configuration Checklist

Before production deployment, ensure:

- [ ] Set strong, unique `JWT_SECRET` (256-bit minimum)
- [ ] Set `CRON_SECRET` for arena batch endpoint
- [ ] Change PostgreSQL credentials from default `postgres:postgres`
- [ ] Set `NODE_ENV=production`
- [ ] Implement actual Twitter API verification
- [ ] Configure proper CORS headers if needed
- [ ] Set up log aggregation with sensitive data filtering
- [ ] Enable PostgreSQL connection SSL
- [ ] Review and remove console.log statements in production

---

## Files Reviewed

| File | Status |
|------|--------|
| `.gitignore` | Properly configured |
| `.env.example` | Safe placeholder values |
| `docker-compose.yml` | Needs credential externalization |
| `src/lib/auth.ts` | JWT secret fallback needs fix |
| `src/lib/db.ts` | Uses Prisma safely |
| `src/lib/security.ts` | Good anomaly detection |
| `src/lib/validation.ts` | Proper Zod validation |
| `src/lib/ratelimit.ts` | Fail-open behavior concern |
| `src/lib/openai.ts` | API key from env |
| `src/lib/anthropic.ts` | API key from env |
| `src/app/api/**` | Authorization properly checked |
| `prisma/schema.prisma` | DATABASE_URL from env |

---

## Conclusion

The codebase follows security best practices in most areas. The main concerns are:

1. **Docker Compose hardcoded credentials** - Critical for production
2. **JWT fallback secret** - Must be fixed before production
3. **Unprotected cron endpoint** - Must require authentication
4. **Twitter verification not implemented** - Authentication bypass

After addressing the HIGH and CRITICAL findings, this application will have a solid security posture suitable for production deployment.
