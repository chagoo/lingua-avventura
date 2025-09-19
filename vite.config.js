import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Para desplegar en GitHub Pages en https://<usuario>.github.io/lingua-avventura/
  // se requiere base '/lingua-avventura/'
  base: '/lingua-avventura/'
})
