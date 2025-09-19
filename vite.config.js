import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Intentamos obtener un hash corto de git; si falla (por ejemplo en entorno donde no hay .git) usamos 'dev'
let commit = 'dev'
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim()
} catch (_) {
  // ignore
}
const buildTime = new Date().toISOString().replace(/[:T-Z.]/g,'').slice(0,12) // AAAAMMDDHHMM aproximado
const appVersion = `${buildTime}-${commit}`

export default defineConfig({
  plugins: [react()],
  // Para desplegar en GitHub Pages en https://<usuario>.github.io/lingua-avventura/
  // se requiere base '/lingua-avventura/'
  base: '/lingua-avventura/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  }
})
