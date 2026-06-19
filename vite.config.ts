import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Default proxy points at local backend for sub-area `ui`
        // smoke-testing (Phase 1 KD-η.2/η.3). Override per
        // developer if hitting prod is needed.
        target: 'https://api.pythoncourse.me',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          flow: ['@xyflow/react', '@dagrejs/dagre'],
          ui: ['framer-motion', 'lucide-react', 'react-markdown', 'react-dropzone']
        }
      }
    }
  }
})
