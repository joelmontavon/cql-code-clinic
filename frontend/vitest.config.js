import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src'),
    },
  },
});