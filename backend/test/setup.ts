import { afterAll, vi } from 'vitest';

// Real Postgres schema, in-process. Each test file gets a fresh database.
vi.mock('../server/lib/prisma', async () => {
  const { createTestPrisma } = await import('./helpers/db');
  const { prisma, close } = await createTestPrisma();
  return { prisma, closeTestDatabase: close };
});

// No outbound SMS, email or websocket traffic from tests; the spies let tests
// assert on what would have been sent.
vi.mock('../server/lib/sms', () => ({ sendSms: vi.fn(async () => {}) }));
vi.mock('../server/lib/mailer', () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock('../server/lib/ws', () => ({ pushToUser: vi.fn(), initWebSocketServer: vi.fn() }));

afterAll(async () => {
  const db = (await import('../server/lib/prisma')) as unknown as { closeTestDatabase: () => Promise<void> };
  // Fire-and-forget notifications may still be writing; give them a moment.
  await new Promise(resolve => setTimeout(resolve, 200));
  await db.closeTestDatabase();
});
