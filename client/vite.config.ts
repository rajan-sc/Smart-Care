import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteMcp } from 'vite-plugin-mcp'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteMcp(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      }
    }
  }
})
