import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import config from './config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: config.frontend.port,
    proxy: {
      '/api': {
        target: config.backendUrl,
        changeOrigin: true,
      }
    }
  },
})
