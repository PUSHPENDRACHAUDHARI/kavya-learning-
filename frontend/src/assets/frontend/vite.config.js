import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy API requests during development to the backend server
  // Bind explicitly to localhost:5173 to make dev server reachable on loopback
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // Proxy any request starting with /api to the backend on port 5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
