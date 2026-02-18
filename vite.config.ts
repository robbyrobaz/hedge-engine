import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hedge-engine/',
  server: {
    proxy: {
      '/api/odds': {
        target: 'https://api.the-odds-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/odds/, '/v4'),
      },
    },
  },
})
