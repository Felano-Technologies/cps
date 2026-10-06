import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Each test file boots its own in-process Postgres (PGlite) and applies
    // every migration, which takes a few seconds.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
