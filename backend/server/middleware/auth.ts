import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME, verifyToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: string };
    }
  }
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return req.cookies?.[COOKIE_NAME];
}

export const SUSPENDED_ERROR = { error: 'Your account has been suspended. Contact CPS operations.', code: 'account_suspended' };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Sessions last months and can't be revoked, so check the account on every
  // request: deleted or suspended users are cut off immediately, and a role
  // change takes effect without waiting for a new token.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, suspendedAt: true },
  });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  if (user.suspendedAt) return res.status(403).json(SUSPENDED_ERROR);

  req.auth = { userId: payload.userId, role: user.role };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
