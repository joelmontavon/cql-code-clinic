import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src'),
      '@components': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src/components'),
      '@services': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src/services'),
      '@utils': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src/utils'),
      '@hooks': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src/hooks'),
      '@contexts': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src/contexts'),
    },
  },
  
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    emptyOutDir: true,
    
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
        dead_code: true,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        properties: true,
      },
      mangle: {
        safari10: true,
      },
    },
    
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Bootstrap and UI components
          'ui-vendor': ['react-bootstrap', 'bootstrap'],
          
          // Monaco Editor (large dependency)
          'monaco-editor': ['@monaco-editor/react', 'monaco-editor'],
          
          // Query and HTTP libraries
          'query-vendor': ['@tanstack/react-query', 'axios'],
          
          // Utility libraries (if they exist)
          'utils-vendor': ['lodash', 'date-fns', 'crypto-js'].filter(pkg => {
            try {
              require.resolve(pkg);
              return true;
            } catch {
              return false;
            }
          }),
          
          // Authentication libraries
          'auth-vendor': ['jwt-decode'].filter(pkg => {
            try {
              require.resolve(pkg);
              return true;
            } catch {
              return false;
            }
          }),
        },
        
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.(js|ts|jsx|tsx)$/, '') 
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
  },
  
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@tanstack/react-query',
      'react-bootstrap',
      '@monaco-editor/react',
      'monaco-editor',
      'axios'
    ],
  },
  
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    devSourcemap: process.env.NODE_ENV === 'development',
  },
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    global: 'globalThis',
  },
  
  // Monaco Editor specific configuration
  worker: {
    format: 'es'
  },
});