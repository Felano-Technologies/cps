import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { PGlite } from '@electric-sql/pglite';
import { PrismaClient } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../prisma/migrations', import.meta.url));

/**
 * An in-process Postgres with every Prisma migration applied, so tests run the
 * real SQL schema without Docker or a database server.
 */
export async function createTestPrisma() {
  const pg = new PGlite();
  const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  for (const name of migrations) {
    await pg.exec(readFileSync(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8'));
  }

  return new PrismaClient({ adapter: new PrismaPGlite(pg) });
}
