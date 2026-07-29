import path from 'path'

import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [swc.vite() as any],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
  test: {
    globals: true,
    // TODO(CAJ2): Only disable for integration (database) tests, or find a way to use parallel databases
    fileParallelism: false,
    // Integration tests hit a real Postgres instance through a full Nest app; the default 5s can be
    // exceeded under load from the full sequential suite even when individual files are healthy.
    testTimeout: 20_000,
    globalSetup: 'test/setup.ts',
    deps: {
      interopDefault: true,
    },
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    reporters: 'default',
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
