import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const productionBase =
    env.VITE_APP_BASE_PATH ||
    env.BASE_PATH ||
    '/';

  return {
    plugins: [react()],
    base: command === 'serve' ? '/' : productionBase,
    server: {
      port: 5173,
      open: true,
      hmr: { overlay: false },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY),
      'import.meta.env.VITE_UPDATE_HABIT_URL': JSON.stringify(env.VITE_UPDATE_HABIT_URL),
    },
  };
});