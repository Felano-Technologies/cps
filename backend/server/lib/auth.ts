import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'cps_session';
const THREE_HUNDRED_DAYS_MS = 300 * 24 * 60 * 60 * 1000;

export interface AuthTokenPayload {
  userId: string;
  role: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '300d' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

function cookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: THREE_HUNDRED_DAYS_MS,
    path: '/',
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

export { COOKIE_NAME };
