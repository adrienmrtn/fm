import { defineConfig } from 'vitest/config';

// Engine tests are pure (no node:sqlite), so no special execArgv needed.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
