# Lingua Avventura

SPA gamificada para aprender idiomas (UI en español) con minijuego tipo Snake (ratón y queso) que narra palabras nuevas al comer. Incluye autenticación y persistencia de progreso en Supabase.

## Desarrollo local
```bash
npm install
npm run api   # opcional: expone la API básica en http://localhost:4000
npm run dev   # en otra terminal, levanta la SPA
```

Si defines la variable `VITE_PACKS_API_URL` (por ejemplo `http://localhost:4000`), la aplicación intentará consumir esa API de vocabulario.
Si la API no está disponible o no defines la variable, se mantiene el paquete local definido en `src/data/packs.json`.

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

### Inserción / Gestión de packs desde la UI

La app incluye una pestaña **Packs** (gestor) para crear o actualizar un pack por lección (`pack = 'lessonX'`, por ejemplo `lesson1`, `lesson2`, etc.).

Para permitir inserciones necesitas (además de RLS habilitado) una política de `INSERT` y un índice único opcional para evitar duplicados:

```sql
-- Política para permitir que usuarios autenticados inserten vocabulario
create policy if not exists "Authenticated insert vocab" on public.vocab_words
  for insert
  with check (auth.role() = 'authenticated');

-- (Opcional) Política para permitir upsert (update) de filas existentes por usuarios autenticados
create policy if not exists "Authenticated update vocab" on public.vocab_words
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Índice único para que (lang, pack, source_word) sea la identidad lógica y se haga merge
create unique index if not exists vocab_words_lang_pack_source_key
  on public.vocab_words(lang, pack, source_word);

-- (Opcional) Política para permitir DELETE (necesaria para migraciones o renombrados que usen copia+borrado)
create policy if not exists "Authenticated delete vocab" on public.vocab_words
  for delete using (auth.role() = 'authenticated');
```

El formulario acepta líneas en formato:

```
palabra=traduccion
otra=another
# líneas que empiezan con # se ignoran
```

Al guardar se hace un **upsert** masivo (`on_conflict=lang,pack,source_word`). Si una palabra ya existe se actualiza su traducción.

Límites y validaciones actuales:
- Máx 300 líneas por envío.
- Se ignoran líneas vacías o sin `=`.
- Se deduplican entradas repetidas dentro del mismo formulario.
- Se puede asignar una dificultad (valor libre) que se guarda en `difficulty`.

### Migrar idioma de un pack
En la sección "Migrar idioma del pack" puedes mover todas las palabras de un pack existente de un idioma origen (`fromLang`) a otro (`toLang`). Estrategia interna:
1. Intenta `PATCH` directo actualizando `lang` para todas las filas del pack.
2. Si hay conflicto (por índice único) hace copia con el nuevo idioma (upsert/merge) y luego borra las filas viejas (requiere política DELETE).

Si una palabra ya existe en el destino, se hace merge (se actualiza `target_word` y `difficulty` si procede).

### Renombrar un pack
La sección "Renombrar pack" permite cambiar el identificador `pack` dentro del mismo idioma.
Proceso:
1. `PATCH` directo (`pack=toPack`).
2. Si conflicto, copia con el nuevo nombre y borra el antiguo (merge de duplicados similar a migración de idioma).

Tras renombrar, la UI refresca automáticamente la lista de packs y, si estabas viendo el pack viejo, cambia al nuevo.

### Dificultad
La columna `difficulty` es `smallint`. La UI mapea automáticamente:
- `easy` → 1
- `medium` → 2
- `hard` → 3
Puedes usar números manualmente si prefieres otra escala.

## Variables de entorno

Ejemplo de `.env.local` para desarrollo:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_PACKS_API_URL=http://localhost:4000   # opcional (servidor Node local)
# VITE_PACKS_API_ALLOW_LOOPBACK=true       # fuerza usar localhost aunque la app esté en otro host
# VITE_SUPABASE_PROGRESS_TABLE=user_progress
```

Para producción (GitHub Pages) las variables se inyectan en build mediante *GitHub Secrets* (no existe `.env` en tiempo de ejecución). Ver sección siguiente.

Durante `npm run dev`/`npm run build` se genera automáticamente `public/runtime-env.js` a partir de las variables disponibles. Ese archivo **no** se versiona (está en `.gitignore`) y queda incluido en el build final para que la SPA pueda leer la configuración en tiempo de ejecución.

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
- (Opcional) `LINGUA_AVVENTURE` con un JSON/base64 que agrupe toda la configuración (ver ejemplo más abajo).
- (Opcional) `VITE_PACKS_API_URL` si quieres usar la API externa como fallback.
- (Opcional) `VITE_PACKS_API_ALLOW_LOOPBACK` si necesitas consumir una URL local desde un host distinto (por ejemplo con un túnel).
3. Asegúrate de que `vite.config.js` tiene `base: '/lingua-avventura/'` (ya configurado).

### Secret compuesto (`LINGUA_AVVENTURE`)

Si prefieres gestionar menos secrets, crea uno llamado `LINGUA_AVVENTURE` con la configuración agrupada. Puede ser un JSON (o su representación en base64) con las claves necesarias:

```json
{
  "VITE_SUPABASE_URL": "https://<project-ref>.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "eyJhbGciOi...",
  "VITE_SUPABASE_PROGRESS_TABLE": "user_progress"
}
```

El workflow de GitHub Actions y la app detectan automáticamente este secret y lo desglosan en las variables `VITE_*` correspondientes durante el build.
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

## Administración (acceso a gestión de packs)
La pestaña **Packs** solo aparece para usuarios cuyo email esté incluido en la variable de entorno `VITE_ADMIN_EMAILS` (lista separada por comas) o, si no se define, para el correo por defecto `ing.santiago.v@gmail.com`.

Ejemplo `.env.local`:
```
VITE_ADMIN_EMAILS=ing.santiago.v@gmail.com,otro.admin@dominio.com
```

En producción (GitHub Pages) define el secret `VITE_ADMIN_EMAILS` con la misma lista.

Si un usuario no admin intenta forzar la pestaña `packs`, el cliente lo redirige a `dashboard` y no renderiza el componente `PackManager`.

El frontend ahora intenta primero verificar la tabla `admins` mediante la función `checkIsAdmin()` (consultando `/rest/v1/admins`). Si la tabla existe y contiene el email del usuario, se muestran las pestañas adicionales:

- `Packs` (gestión de vocabulario)
- `Admin` (nueva) para administrar la lista de administradores desde la UI.

La página `Admin` permite:
1. Listar admins actuales (muestra `email` y estado).
2. Agregar un nuevo admin por email (aunque aún no tenga `user_id` hasta su primer login).
3. Eliminar admins.

Requiere que la tabla `admins` tenga políticas `SELECT/INSERT/DELETE` restringidas a usuarios que ya son admin (usando la función `is_admin()`). La variable `VITE_ADMIN_EMAILS` funciona como fallback rápido en entornos donde aún no has creado la tabla.

### Reforzar con RLS (server-side)
La protección del frontend evita el acceso casual, pero para impedir inserciones directas vía REST se recomienda restringir `INSERT/UPDATE/DELETE` a una lista de admins en la base de datos.

Ejemplo simple (lista fija de emails incorporada en la política):
```sql
create or replace function public.is_admin_email() returns boolean language sql stable as $$
  select lower(auth.jwt() ->> 'email') = any (array['ing.santiago.v@gmail.com','otro.admin@dominio.com'])
$$;

-- Reemplaza las políticas previas de insert/update/delete por estas:
create policy "Admins insert vocab" on public.vocab_words
  for insert with check (public.is_admin_email());

create policy "Admins update vocab" on public.vocab_words
  for update using (public.is_admin_email()) with check (public.is_admin_email());

create policy "Admins delete vocab" on public.vocab_words
  for delete using (public.is_admin_email());
```

O bien usando una tabla `admins` para gestionarlo sin editar la función:
```sql
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique
);

create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;

create policy "Admins insert vocab" on public.vocab_words
  for insert with check (public.is_admin());
create policy "Admins update vocab" on public.vocab_words
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete vocab" on public.vocab_words
  for delete using (public.is_admin());
```

Para registrar tu usuario tras el primer login:
```sql
insert into public.admins(user_id, email)
select id, email from auth.users where email = 'ing.santiago.v@gmail.com'
on conflict (user_id) do nothing;
```


## Pth local
- C:\FILES_\__personal_\apps\lingua-avventura\lingua-avventura

## Mini diálogos (comprensión y producción)

Actividad enfocada en practicar traducción contextual breve con dos modos intercambiables que se recuerdan entre sesiones.

### Modos
- Comprensión ("mcq"): Se muestra la frase/palabra en el idioma objetivo (L2) y debes escoger su traducción correcta en español entre 4 opciones (1 correcta + 3 distractores).
- Producción ("produce"): Se muestra la frase/palabra en español y debes escribirla en el idioma objetivo. Incluye validación flexible (fuzzy) para tolerar pequeños errores tipográficos.

La preferencia persistente del modo se guarda en `progress.settings.dialoguesMode`.

### Generación de turnos
Se selecciona un subconjunto barajado del pack (máx ~8 ítems por sesión rápida) y se construyen turnos. Cada fallo en un turno lo envía a una cola de reintentos que se procesa al terminar la primera pasada (espaciado inmediato para reforzar). Un turno marcado como reintento se etiqueta visualmente.

### Racha y mejores rachas
Cada acierto consecutivo incrementa la racha actual. Un fallo la reinicia. Se guarda `bestStreak` por modo (comprensión y producción) de forma independiente en `progress.stats.dialogues[modo].bestStreak`.

### Métricas acumuladas
Por modo se registran:
- `correct`: total de aciertos.
- `attempts`: intentos totales (incluye fallos y aciertos; los aciertos en reintento también suman attempts).
- `bestStreak`: mejor racha histórica modo-específica.
- `fuzzy`: (solo producción) número de aciertos aceptados por tolerancia de un error (ver abajo).

Estructura ejemplo en el progreso:
```json
"stats": {
  "dialogues": {
    "mcq": { "correct": 40, "attempts": 55, "bestStreak": 9 },
    "produce": { "correct": 18, "attempts": 27, "bestStreak": 5, "fuzzy": 3 }
  }
}
```

### Normalización de respuestas (producción)
Antes de comparar se aplica:
1. `toLowerCase()`
2. Normalización Unicode NFD removiendo diacríticos (`áéíóúüñ` → base equivalente)
3. Eliminación de caracteres no alfanuméricos relevantes
4. Colapso de espacios múltiples y `trim()`

### Tolerancia fuzzy (Levenshtein)
Si la respuesta normalizada no es idéntica pero la longitud esperada > 4 y la distancia de Levenshtein = 1, se considera correcta "fuzzy" (≈ error de una letra). Estos casos suman XP reducido y se contabilizan en `fuzzy`.

### Reintentos
Un fallo envía el turno a la cola de reintentos con bandera `retry: true`. Al terminar la primera ronda se reemplaza la lista de turnos por la cola y se continúa hasta vaciarla.

### Reglas de XP
Por turno (antes de bonus final):
- Comprensión: acierto primer intento +4 XP; acierto en reintento +1 XP.
- Producción: acierto primer intento +6 XP; acierto en reintento +2 XP.
- Penalización fuzzy (producción): primer intento ≈60% del valor base (mín 2); reintento ≈50% (mín 1).
- Bonus de racha: en aciertos de primer intento se añade `min(4, floor(racha/3))` XP.

Al finalizar la sesión:
- Bonus de finalización proporcional a aciertos (`≈ 0.4 * correctCount`, mínimo 2).
- Bonus adicional por mejor racha de la sesión (`≈ bestStreak * 0.5`, máx 10).

### Persistencia y optimización (debounce)
Las mutaciones de progreso dentro de la actividad se acumulan en memoria y se guardan con un debounce (~5s) para evitar múltiples escrituras seguidas hacia Supabase. Al cerrar la actividad (fase terminada) se fuerza un flush. Esto reduce picos de peticiones y previene errores de recursos cuando hay muchas respuestas rápidas.

### Extensiones futuras previstas
- Retry con backoff exponencial si el guardado falla (pendiente).
- Fallback offline: cache temporal en `localStorage` y reintento al recuperar conectividad (pendiente).

### Personalización rápida
Puedes ajustar valores de XP, longitud mínima para fuzzy o número máximo de turnos modificando el componente `MiniDialogues.jsx` (buscar los comentarios y constantes en la parte superior del archivo).

