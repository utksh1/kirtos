import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',               // Modern JS — smaller output, no unnecessary polyfills
    reportCompressedSize: true,     // Show gzip sizes in build output
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate, cache-friendly chunks
          'react-vendor': ['react', 'react-dom'],
          'animation-vendor': ['framer-motion'],
          'livekit-vendor': ['livekit-client', '@livekit/components-react', '@livekit/components-styles'],
          'ogl-vendor': ['ogl'],
        },
      },
    },
  },
})

