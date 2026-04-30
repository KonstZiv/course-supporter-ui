import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// First test infrastructure for the UI repo (task 0.UI). Kept minimal:
// jsdom + RTL setup file. Coverage, browser mode, parallel sharding —
// adopt later if/when the test suite grows beyond smoke level.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
