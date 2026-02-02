import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { generateVerificationCode } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { handleApiError } from '@/lib/errors';

// GET - Generate a new verification code
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await checkRateLimit('register', ip);

    // Generate a unique code
    const code = generateVerificationCode();
    
    // Store pending verification (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.pendingVerification.create({
      data: {
        code,
        expiresAt,
      },
    });

    // Clean up expired verifications
    await prisma.pendingVerification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return Response.json({
      code,
      message: 'Tweet this code to verify your account',
      expiresIn: '15 minutes',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
