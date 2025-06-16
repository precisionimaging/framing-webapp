import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  plugins: [
    react({
      jsxRuntime: 'automatic',
      include: '**/*.{jsx,tsx}',
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: 'assets/[name][extname]',
        chunkFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true
  },
  preview: {
    port: 3000,
    open: true,
    host: true
  },
  base: process.env.NODE_ENV === 'production' 
    ? '/wp-content/plugins/custom-frame-designer/dist/' 
    : '/'
});
