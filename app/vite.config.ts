import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    target: 'esnext',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: {

          'react-vendor': ['react', 'react-dom'],
          'animation-vendor': ['framer-motion'],
          'livekit-vendor': ['livekit-client', '@livekit/components-react', '@livekit/components-styles'],
          'ogl-vendor': ['ogl']
        }
      }
    }
  }
});