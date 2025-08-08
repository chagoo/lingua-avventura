import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '' // <- si usas GitHub Pages con user/REPO, cambia a '/REPO/'
})
