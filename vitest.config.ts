import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clerk/nextjs/server': path.resolve(__dirname, './tests/mocks/clerkServerMock.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}'],
    exclude: ['tests/e2e/**', 'node_modules/**', '**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/pages/**/*', 'src/components/ui/**', 'src/vite-env.d.ts'],
      reportsDirectory: '.test-reports/coverage',
    },
  },
});


