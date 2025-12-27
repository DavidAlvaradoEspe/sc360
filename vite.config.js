import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Comprehensive Node.js polyfills for ambisonics npm package
    nodePolyfills({
      // Enable polyfills for global, Buffer, process, etc.
      globals: {
        global: true,
        Buffer: true,
        process: true,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@anthropic-ai/sdk']
  },
})
