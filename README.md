# Lingua Avventura

SPA gamificada para aprender idiomas (UI en español) con minijuego tipo Snake (ratón y queso) que narra palabras nuevas al comer. Incluye autenticación y persistencia de progreso en Supabase.

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

### Tabla de vocabulario (opcional si usas Supabase en lugar de la API local)

Para migrar `src/data/packs.json` a Supabase se usa una tabla `vocab_words`:

```sql
create table if not exists public.vocab_words (
  id bigint generated always as identity primary key,
  lang text not null,
  source_word text not null,
  target_word text not null,
  pack text not null default 'default',
  difficulty smallint,
  created_at timestamptz default now()
);

alter table public.vocab_words enable row level security;
create policy "Public read vocab" on public.vocab_words for select using (true);
```

El cliente intentará obtener primero desde Supabase, luego desde `VITE_PACKS_API_URL` (si existe) y finalmente desde `packs.json` local.

## Variables de entorno

Ejemplo de `.env.local` para desarrollo:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_PACKS_API_URL=http://localhost:4000   # opcional (servidor Node local)
# VITE_SUPABASE_PROGRESS_TABLE=user_progress
```

Para producción (GitHub Pages) las variables se inyectan en build mediante *GitHub Secrets* (no existe `.env` en tiempo de ejecución). Ver sección siguiente.

## Build
```bash
npm run build
npm run preview
```

## Despliegue en GitHub Pages + Supabase

El repositorio incluye un workflow en `.github/workflows/deploy.yml` que:
1. Hace build (`npm ci && npm run build`).
2. Publica `dist/` en GitHub Pages.

### Pasos
1. En GitHub: Settings → Pages: Source = GitHub Actions.
2. Añade secrets en Settings → Secrets → Actions:
  - `VITE_SUPABASE_URL` (Project URL sin barra final)
  - `VITE_SUPABASE_ANON_KEY` (anon key)
  - (Opcional) `VITE_PACKS_API_URL` si quieres usar la API externa como fallback.
3. Asegúrate de que `vite.config.js` tiene `base: '/lingua-avventura/'` (ya configurado).
4. Push a `main` para disparar el workflow.
5. Visita: `https://<usuario>.github.io/lingua-avventura/`.

### Verificación
En la consola del navegador puedes confirmar:
```js
import.meta.env.VITE_SUPABASE_URL
```
Debe mostrar tu URL de Supabase. Si es `undefined`, revisa los secrets y el log del workflow.

### Notas de autenticación
- Email/password funciona sin redirects especiales.
- Para OAuth deberás añadir la URL de Pages a la lista de Redirect URLs en Supabase.

## Fallback de vocabulario
Orden de resolución al cargar un pack:
1. Supabase (`vocab_words`).
2. API REST (`VITE_PACKS_API_URL`).
3. Archivo local `packs.json`.

## Desarrollo rápido (cheatsheet)
```
npm install
npm run api     # opcional (servidor vocab)
npm run dev
```

## Build / Preview local
```
npm run build
npm run preview
```

## Roadmap corto
- Selector de "pack" usando la columna `pack`.
- Dificultad adaptativa (campo `difficulty`).
- OAuth providers.
