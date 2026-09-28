import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/console/',                    // the deck serves it from ~/vyom/console/
  server: {
    // DEV ONLY. VYOM_DECK is set by compose.yaml (5.0b); natively it is unset.
    proxy: { '/vyom': process.env.VYOM_DECK ?? 'http://127.0.0.1:8765' },
  },
})
