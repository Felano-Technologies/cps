import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashApiKey, looksLikeApiKey } from '../lib/apiKeys';

declare global {
  namespace Express {
    interface Request {
      business?: { id: string; name: string; apiKeyId: string };
    }
  }
}

/** Partner API error body: `{ error: { code, message, details? } }`. */
export function partnerError(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
}

const LAST_USED_WRITE_INTERVAL_MS = 60_000;

function extractKey(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  const alt = req.headers['x-api-key'];
  return typeof alt === 'string' ? alt.trim() : undefined;
}

/** Authenticates a Partner API request by its secret key and loads the owning business. */
export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = extractKey(req);
  if (!key || !looksLikeApiKey(key)) {
    return partnerError(res, 401, 'unauthorized', 'Missing or malformed API key. Send it as "Authorization: Bearer cps_live_…".');
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(key) },
    include: { business: { select: { id: true, name: true, status: true } } },
  });

  if (!apiKey || apiKey.revokedAt) {
    return partnerError(res, 401, 'unauthorized', 'Invalid or revoked API key.');
  }
  if (apiKey.business.status !== 'approved') {
    return partnerError(res, 403, 'forbidden', `Business account is ${apiKey.business.status}.`);
  }

  // Throttled so every request doesn't write to the database.
  if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }

  req.business = { id: apiKey.business.id, name: apiKey.business.name, apiKeyId: apiKey.id };
  next();
}
