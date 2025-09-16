# Lingua Avventura

SPA gamificada para aprender italiano (UI en español) con minijuego tipo Snake (ratón y queso) que narra palabras nuevas al comer.

## Desarrollo local
```bash
npm install
npm run api   # expone la API básica en http://localhost:4000
npm run dev   # en otra terminal, levanta la SPA
```

La aplicación intenta consumir la API de vocabulario en `VITE_PACKS_API_URL` (por defecto `http://localhost:4000`).
Si la API no está disponible, se mantiene el paquete local definido en `src/data/packs.json`.

## Build
```bash
npm run build
npm run preview
```

## GitHub Pages
1. Crea el repo `lingua-avventura`.
2. Empuja el proyecto.
3. En `vite.config.js` ajusta `base: '/lingua-avventura/'`.
4. `npm run build` y publica el contenido de `dist/` en la rama `gh-pages` (o usa GitHub Action).
