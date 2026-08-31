import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_OPS_PASSWORD || 'CpsOps#2026!';

const SEED_OPERATIONS_ACCOUNTS = [
  { name: 'Operations', email: 'operations@cps.com' },
  { name: 'Felano', email: 'felano@cps.com' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const account of SEED_OPERATIONS_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      console.log(`[seed] ${account.email} already exists — skipping`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: 'operations',
      },
    });
    console.log(`[seed] Created operations account: ${account.email}`);
  }
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
