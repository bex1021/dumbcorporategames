import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // honor an assigned PORT (preview/CI tooling); defaults to vite's 5173 locally
  server: { port: Number(process.env.PORT) || 5173 },
})
