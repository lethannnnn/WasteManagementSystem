import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Polling required for Windows host + Docker container file watching
      usePolling: true,
      interval: 1000,
    },
  },
})
