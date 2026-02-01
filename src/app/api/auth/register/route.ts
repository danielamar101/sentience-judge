import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, createToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { registerSchema, safeValidate } from '@/lib/validation';
import { handleApiError, ConflictError, BadRequestError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Check rate limit
    await checkRateLimit('register', ip);

    // Parse and validate body
    const body = await request.json();
    const validation = safeValidate(registerSchema, body);

    if (!validation.success) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { email, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Create JWT token
    const token = createToken({
      userId: user.id,
      email: user.email,
    });

    return Response.json(
      {
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
