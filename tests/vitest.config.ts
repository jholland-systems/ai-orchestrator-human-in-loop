import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'ai-cd-integration',
    globals: true,
    environment: 'node',
    testTimeout: 60_000, // 60s - containers can be slow on first pull
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['../packages/*/src/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts'
      ]
    },
    setupFiles: [],
    pool: 'forks', // Better isolation for container tests
    poolOptions: {
      forks: {
        singleFork: true // Reuse containers across tests
      }
    }
  }
});
