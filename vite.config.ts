import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/MyDash/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MyDash',
        short_name: 'MyDash',
        description: 'Personal Dashboard App',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/MyDash/',
        scope: '/MyDash/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - cached long-term, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client - separate chunk for auth/data layer
          'vendor-supabase': ['@supabase/supabase-js'],
          // ReactFlow - only needed for Notes canvas feature
          'vendor-reactflow': ['reactflow'],
          // Date utilities - used across multiple features
          'vendor-date': ['date-fns'],
          // State management
          'vendor-state': ['zustand', 'zundo'],
          // UI libraries - icons and markdown editor
          'vendor-ui': ['lucide-react', '@uiw/react-md-editor'],
        },
      },
    },
  },
});
