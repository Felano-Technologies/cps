import { vi } from 'vitest';

// Real Postgres schema, in-process. Each test file gets a fresh database.
vi.mock('../server/lib/prisma', async () => {
  const { createTestPrisma } = await import('./helpers/db');
  return { prisma: await createTestPrisma() };
});

// No outbound SMS, email or websocket traffic from tests; the spies let tests
// assert on what would have been sent.
vi.mock('../server/lib/sms', () => ({ sendSms: vi.fn(async () => {}) }));
vi.mock('../server/lib/mailer', () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock('../server/lib/ws', () => ({ pushToUser: vi.fn(), initWebSocketServer: vi.fn() }));
