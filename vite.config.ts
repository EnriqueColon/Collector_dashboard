import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Create an empty temp directory for env files to avoid .env permission issues
// Frontend doesn't need .env anyway (backend handles auth via proxy)
const tempEnvDir = join(process.cwd(), '.vite-env-temp')
try {
  if (!existsSync(tempEnvDir)) {
    mkdirSync(tempEnvDir, { recursive: true })
  }
} catch (e) {
  // If we can't create it, Vite will use process.cwd() but that's okay
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use temp directory to avoid .env permission issues
  // This prevents Vite from trying to read the root .env file
  envDir: tempEnvDir,
  envPrefix: 'VITE_',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

