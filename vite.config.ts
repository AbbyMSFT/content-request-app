import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || '5178'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || '3002'}`,
        changeOrigin: true,
      }
    }
  },
})
