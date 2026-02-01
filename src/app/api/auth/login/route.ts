import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { loginSchema, safeValidate } from '@/lib/validation';
import { handleApiError, UnauthorizedError, BadRequestError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Parse body first to get email for rate limiting
    const body = await request.json();
    const validation = safeValidate(loginSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Get IP for rate limiting (IP + email combo)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await checkRateLimit('login', `${ip}:${normalizedEmail}`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create JWT token
    const token = createToken({
      userId: user.id,
      email: user.email,
    });

    return Response.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
