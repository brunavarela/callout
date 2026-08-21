import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../../', // .env vive na raiz do monorepo, compartilhado com apps/api
  server: {
    port: 5290,
    strictPort: true,
  },
})
