import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createToken, extractTwitterHandle } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { verifyTweetSchema, safeValidate } from '@/lib/validation';
import { handleApiError, BadRequestError, NotFoundError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await checkRateLimit('login', ip);

    const body = await request.json();
    const validation = safeValidate(verifyTweetSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { tweetUrl, code } = validation.data;

    // Extract Twitter handle from the tweet URL
    const twitterHandle = extractTwitterHandle(tweetUrl);
    if (!twitterHandle) {
      throw new BadRequestError('Could not extract Twitter handle from URL');
    }

    // Find the pending verification
    const pending = await prisma.pendingVerification.findUnique({
      where: { code },
    });

    if (!pending) {
      throw new NotFoundError('Verification code not found or expired');
    }

    if (pending.expiresAt < new Date()) {
      // Clean up expired verification
      await prisma.pendingVerification.delete({ where: { code } });
      throw new BadRequestError('Verification code has expired');
    }

    // TODO: In production, you would actually fetch the tweet and verify:
    // 1. The tweet exists
    // 2. The tweet contains the verification code
    // 3. The tweet is from the claimed handle
    // For now, we trust the URL format validation

    // Delete the used verification code
    await prisma.pendingVerification.delete({ where: { code } });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { twitterHandle },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { twitterHandle },
      });
    }

    // Create JWT token
    const token = createToken({
      userId: user.id,
      twitterHandle: user.twitterHandle,
    });

    return Response.json({
      message: user ? 'Welcome back!' : 'Account created successfully',
      token,
      user: {
        id: user.id,
        twitterHandle: user.twitterHandle,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
