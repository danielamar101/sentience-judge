import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from './errors';
import crypto from 'crypto';

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  expiresIn: '7d' as const,
  algorithm: 'HS256' as const,
};

export interface JwtPayload {
  userId: string;
  twitterHandle: string;
  iat?: number;
  exp?: number;
}

export function generateVerificationCode(): string {
  // Generate a 6-character alphanumeric code
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
    algorithm: JWT_CONFIG.algorithm,
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, JWT_CONFIG.secret, {
      algorithms: [JWT_CONFIG.algorithm],
    });
    return payload as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export async function withAuth(request: NextRequest): Promise<JwtPayload> {
  const token = extractToken(request);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }
  return verifyToken(token);
}

export function getAuthFromCookie(request: NextRequest): JwtPayload | null {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return null;
  }
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// Extract Twitter handle from tweet URL
export function extractTwitterHandle(tweetUrl: string): string | null {
  const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)\/status\/\d+/);
  if (!match) return null;
  return match[1].replace('@', '').toLowerCase();
}
