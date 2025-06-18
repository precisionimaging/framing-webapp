import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components')
    },
    extensions: ['.js', '.jsx', '.json']
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      include: ['**/*.jsx', '**/*.js'],
      babel: {
        presets: [
          '@babel/preset-react',
          ['@babel/preset-env', {
            targets: {
              esmodules: true,
            },
            bugfixes: true,
            useBuiltIns: 'usage',
            corejs: 3,
          }]
        ],
        plugins: [
          ['@babel/plugin-proposal-class-properties', { loose: true }],
          ['@babel/plugin-proposal-private-methods', { loose: true }],
          ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-transform-runtime'
        ]
      }
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
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      }
    },
    commonjsOptions: {
      esmExternals: true
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
