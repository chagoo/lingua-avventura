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

## Configuración de Supabase

Para sincronizar el progreso y manejar la autenticación se usa Supabase. Configura las siguientes variables en un archivo `.env.local` (o en tu entorno):

```
VITE_SUPABASE_URL=...       # URL del proyecto (Settings → API → Project URL)
VITE_SUPABASE_ANON_KEY=...  # Clave pública (anon) del proyecto
# Opcional: nombre de la tabla donde se guarda el estado
# VITE_SUPABASE_PROGRESS_TABLE=user_progress
# Opcional: forzar backend (por defecto detecta Supabase si las credenciales están presentes)
# VITE_BACKEND=supabase
```

Crea una tabla (por defecto `user_progress`) con la siguiente estructura:

```sql
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  updated_at timestamptz default now()
);
```

Una vez configurado, el inicio de sesión y el guardado de progreso se realizarán automáticamente contra tu proyecto de Supabase.

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
