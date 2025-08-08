import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/lingua-avventura/', // ⚠️ usa el nombre de tu repo exacto
  plugins: [react()],
});
