import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Build-time check: Prevent mock mode in production
if (process.env.NODE_ENV === 'production' && process.env.VITE_MOCK_API === 'true') {
  throw new Error('VITE_MOCK_API cannot be true in production builds. Set VITE_MOCK_API=false or remove it before building for production.');
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['socket.io-client'],
  },
  server: {
    port: 5174,
  },
})
