import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: [
      'mcp/__tests__/**/*.test.mts',
      '**/*.test.ts',
      '**/*.test.mts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
    ],

    // Test environment
    environment: 'node',

    // Global test timeout
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['mcp/**/*.mts'],
      exclude: [
        'mcp/__tests__/**',
        '**/*.d.ts',
      ],
      thresholds: {
        // Per spec: 85% coverage target
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Pool configuration for parallel testing
    pool: 'forks',

    // Watch mode configuration
    watch: false,

    // Globals (describe, it, expect)
    globals: true,
  },
});
