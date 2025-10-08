const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

function toCamelCase(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("");
}

let aggregatedEnvCache;

function decodeBase64(str) {
  if (typeof str !== "string" || !str) return null;
  try {
    if (typeof atob === "function") {
      return atob(str);
    }
  } catch (err) {
    /* ignore */
  }
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "base64").toString("utf-8");
    } catch (err) {
      /* ignore */
    }
  }
  return null;
}

function parseAggregatedCandidate(candidate) {
  if (!candidate) return null;
  if (typeof candidate === "object") {
    return candidate;
  }
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const tryParseJson = (value) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      return null;
    }
  };

  let parsed = tryParseJson(trimmed);
  if (parsed && typeof parsed === "object") return parsed;

  const decoded = decodeBase64(trimmed);
  if (decoded) {
    parsed = tryParseJson(decoded.trim());
    if (parsed && typeof parsed === "object") return parsed;
  }

  const kvPairs = {};
  trimmed
    .split(/[\n\r;,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.split(/[:=]/);
      if (match.length >= 2) {
        const key = match[0].trim();
        const value = match.slice(1).join(":=").trim();
        if (key) kvPairs[key] = value;
      }
    });
  if (Object.keys(kvPairs).length > 0) {
    return kvPairs;
  }

  const pipeParts = trimmed.split("|");
  if (pipeParts.length >= 2) {
    const [url, anonKey, progress] = pipeParts.map((part) => part.trim()).filter(Boolean);
    const result = {};
    if (url) result.VITE_SUPABASE_URL = url;
    if (anonKey) result.VITE_SUPABASE_ANON_KEY = anonKey;
    if (progress) result.VITE_SUPABASE_PROGRESS_TABLE = progress;
    if (Object.keys(result).length > 0) {
      return result;
    }
  }

  return null;
}

function getAggregatedEnv() {
  if (aggregatedEnvCache !== undefined) return aggregatedEnvCache;

  const processEnv = typeof process !== "undefined" && process?.env ? process.env : undefined;
  const globalEnv =
    (typeof globalThis !== "undefined" &&
      (globalThis.__ENV__ || globalThis.__APP_ENV__ || globalThis.__APP_CONFIG__)) ||
    undefined;

  const aggregatedKeys = [
    "LINGUA_AVVENTURE",
    "LINGUA_AVVENTURA",
    "SUPABASE_CONFIG",
    "APP_CONFIG",
    "LINGUA_CONFIG",
  ];

  const candidates = [];
  const addCandidate = (value) => {
    if (value == null) return;
    candidates.push(value);
  };

  aggregatedKeys.forEach((key) => {
    if (env && env[key] != null) addCandidate(env[key]);
    if (processEnv && processEnv[key] != null) addCandidate(processEnv[key]);
    if (globalEnv && typeof globalEnv === "object" && key in globalEnv) addCandidate(globalEnv[key]);
    if (typeof globalThis !== "undefined" && globalThis[key] != null) addCandidate(globalThis[key]);
  });

  if (typeof globalEnv === "object" && globalEnv) {
    candidates.push(globalEnv);
  }

  for (const candidate of candidates) {
    const parsed = parseAggregatedCandidate(candidate);
    if (parsed && typeof parsed === "object") {
      aggregatedEnvCache = parsed;
      return aggregatedEnvCache;
    }
  }

  aggregatedEnvCache = null;
  return aggregatedEnvCache;
}

function readRuntimeEnv(key) {
  const variants = [key];
  if (key.startsWith("VITE_")) {
    const bare = key.slice(5);
    if (bare) variants.push(bare);
    variants.push(`REACT_APP_${bare}`);
    variants.push(`NEXT_PUBLIC_${bare}`);
    if (bare) {
      const camel = toCamelCase(bare);
      if (camel) variants.push(camel);
      const lower = camel.toLowerCase();
      if (lower && lower !== camel) variants.push(lower);
    }
  }

  const processEnv = typeof process !== "undefined" && process?.env ? process.env : undefined;
  const globalEnv =
    (typeof globalThis !== "undefined" &&
      (globalThis.__ENV__ || globalThis.__APP_ENV__ || globalThis.__APP_CONFIG__)) ||
    undefined;

  for (const name of variants) {
    if (env && env[name] != null) return env[name];
    if (globalEnv && globalEnv[name] != null) return globalEnv[name];
    if (processEnv && processEnv[name] != null) return processEnv[name];
    const aggregated = getAggregatedEnv();
    if (aggregated && aggregated[name] != null) return aggregated[name];
    if (aggregated && typeof aggregated === "object") {
      for (const key in aggregated) {
        if (!Object.prototype.hasOwnProperty.call(aggregated, key)) continue;
        if (toCamelCase(key) === toCamelCase(name)) {
          return aggregated[key];
        }
      }
    }
  }
  return undefined;
}

function normalizeEnvValue(value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "undefined" || lower === "null") return undefined;
  return trimmed;
}

function readBackendPreference() {
  const raw = normalizeEnvValue(readRuntimeEnv("VITE_BACKEND"));
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  if (normalized === "supabase" || normalized === "local") return normalized;
  return "";
}

let warnedPlaceholderForUrl = null;
let warnedMalformedForUrl = null;

function resolveSupabaseEnv() {
  const aggregated = getAggregatedEnv();

  const resolveFromAggregated = (object, ...keys) => {
    if (!object) return undefined;
    for (const key of keys) {
      if (object[key] != null) return object[key];
      const camelKey = toCamelCase(key);
      for (const candidateKey of Object.keys(object)) {
        if (toCamelCase(candidateKey) === camelKey && object[candidateKey] != null) {
          return object[candidateKey];
        }
      }
    }
    return undefined;
  };

  const aggregatedGroups = [];
  if (aggregated && typeof aggregated === "object") {
    aggregatedGroups.push(aggregated);
    const nestedCandidates = [
      aggregated.supabase,
      aggregated.supabaseConfig,
      aggregated.supabase_credentials,
      aggregated.supabaseSettings,
      aggregated.credentials,
    ];
    nestedCandidates.forEach((candidate) => {
      if (candidate && typeof candidate === "object") {
        aggregatedGroups.push(candidate);
      }
    });
  }

  const findAggregated = (...keys) => {
    for (const group of aggregatedGroups) {
      const value = resolveFromAggregated(group, ...keys);
      if (value != null) return value;
    }
    return undefined;
  };

  const rawUrl = normalizeEnvValue(
    readRuntimeEnv("VITE_SUPABASE_URL") ||
      findAggregated("VITE_SUPABASE_URL", "SUPABASE_URL", "supabaseUrl", "url", "projectUrl")
  );
  const url = rawUrl ? rawUrl.replace(/\/$/, "") : undefined;
  const anonKey = normalizeEnvValue(
    readRuntimeEnv("VITE_SUPABASE_ANON_KEY") ||
      findAggregated("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "anonKey", "key", "supabaseAnonKey")
  );
  const progressTable =
    normalizeEnvValue(
      readRuntimeEnv("VITE_SUPABASE_PROGRESS_TABLE") ||
        findAggregated("VITE_SUPABASE_PROGRESS_TABLE", "progressTable", "table")
    ) || "user_progress";

  // Advertencias solamente una vez por URL detectada
  if (typeof console !== "undefined" && url) {
    if (warnedPlaceholderForUrl !== url && /tu-proyecto\.supabase\.co/.test(url)) {
      warnedPlaceholderForUrl = url;
      // eslint-disable-next-line no-console
      console.warn("[supabase] Estás usando el placeholder 'tu-proyecto.supabase.co'. Reemplázalo en .env.local con la Project URL real desde Supabase (Settings → API → Project URL).");
    }

    const malformed =
      /localhost:5173\/https/.test(url) ||
      /https?:\/\/$/.test(url) ||
      /https?:\/\/https?:/.test(url);
    if (malformed && warnedMalformedForUrl !== url) {
      warnedMalformedForUrl = url;
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ [supabase] La URL configurada parece inválida: "${url}". Debe verse como: https://<project-ref>.supabase.co (sin barra final extra). Corrige VITE_SUPABASE_URL en .env.local y reinicia 'npm run dev'.`
      );
    }
  }

  return { url, anonKey, progressTable };
}

const SESSION_KEY = "lingua_supabase_session_v1";

let currentSession = loadStoredSession();
let refreshPromise = null;
const authListeners = new Set();

function hasLocalStorage() {
  try {
    return typeof localStorage !== "undefined";
  } catch (e) {
    return false;
  }
}

function loadStoredSession() {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[supabase] No se pudo parsear la sesión almacenada.", e);
    return null;
  }
}

function persistSession(session) {
  currentSession = session;
  if (!hasLocalStorage()) {
    notifyAuthListeners();
    return;
  }
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  notifyAuthListeners();
}

function notifyAuthListeners() {
  const user = currentSession?.user ?? null;
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.error("[supabase] Error notificando listener de auth", err);
    }
  });
}

function isSessionExpired(session) {
  if (!session?.expires_at) return false;
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at <= now + 30; // margen de seguridad
}

function enrichSession(session) {
  if (!session) return null;
  const enriched = { ...session };
  if (!enriched.expires_at && enriched.expires_in) {
    enriched.expires_at = Math.floor(Date.now() / 1000) + Number(enriched.expires_in);
  }
  return enriched;
}

function normalizeSession(payload) {
  if (!payload) return null;
  if (payload.session) {
    return enrichSession(payload.session);
  }
  if (payload.access_token) {
    const base = enrichSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
      expires_at: payload.expires_at,
      token_type: payload.token_type || "bearer",
      user: payload.user ?? null,
    });
    return base;
  }
  return null;
}

function authHeaders() {
  const { anonKey } = requireConfig();
  return {
    apikey: anonKey,
    "Content-Type": "application/json",
  };
}

function restHeaders(token) {
  const { anonKey } = requireConfig();
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
}

function authUrl(path) {
  const { url } = requireConfig();
  return `${url}/auth/v1${path}`;
}

function restUrl(path) {
  const { url } = requireConfig();
  return `${url}/rest/v1${path}`;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("[supabase] Respuesta no es JSON válido", text);
    return null;
  }
}

async function buildError(response, fallbackMessage, existingData) {
  const data = existingData === undefined ? await parseJson(response) : existingData;
  const message =
    data?.error_description ||
    data?.message ||
    data?.msg ||
    fallbackMessage ||
    response.statusText ||
    "Error en Supabase";
  const error = new Error(message);
  error.status = response.status;
  error.data = data;
  return error;
}

async function ensureValidSession() {
  if (!currentSession) return null;
  if (!isSessionExpired(currentSession)) return currentSession;
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  try {
    await refreshPromise;
  } catch (err) {
    console.warn("[supabase] No se pudo refrescar la sesión", err);
    persistSession(null);
    throw err;
  }
  return currentSession;
}

async function refreshSession() {
  if (!currentSession?.refresh_token) {
    persistSession(null);
    return null;
  }
  const response = await fetch(authUrl("/token?grant_type=refresh_token"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
  });
  if (!response.ok) {
    throw await buildError(response, "No se pudo refrescar la sesión");
  }
  const data = await parseJson(response);
  const session = normalizeSession({ ...data, user: data?.user ?? currentSession?.user ?? null });
  persistSession(session);
  return session;
}

async function restFetch(path, options = {}, { retry = true } = {}) {
  const session = await ensureValidSession();
  if (!session?.access_token) {
    throw new Error("AUTH_REQUIRED");
  }
  const headers = {
    ...restHeaders(session.access_token),
    ...options.headers,
  };
  const response = await fetch(restUrl(path), {
    ...options,
    headers,
  });
  if (response.status === 401 && retry) {
    await refreshSession();
    return restFetch(path, options, { retry: false });
  }
  return response;
}
// Helper genérico para insertar / upsert de filas en una tabla (POST a REST)
// rows: array de objetos
// options: { onConflict?: string, prefer?: string }
async function restUpsert(table, rows, { onConflict, prefer } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("NO_ROWS");
  }
  const params = [];
  if (onConflict) params.push(`on_conflict=${encodeURIComponent(onConflict)}`);
  const query = params.length ? `?${params.join('&')}` : '';
  const response = await restFetch(`/${encodeURIComponent(table)}${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const data = await response.text();
    const err = new Error(`UPSERT_FAILED:${response.status}`);
    err.status = response.status;
    err.body = data;
    throw err;
  }
  // Si Prefer contiene 'return=representation', devolver JSON
  if (/return=representation/.test(prefer || '')) {
    try {
      return await response.json();
    } catch {
      return [];
    }
  }
  return [];
}

function requireConfig() {
  const cfg = resolveSupabaseEnv();
  if (!cfg.url || !cfg.anonKey) {
    throw new Error("Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
  return cfg;
}

export function isSupabaseConfigured() {
  if (isBackendForcedLocal()) return false;
  const cfg = resolveSupabaseEnv();
  return Boolean(cfg.url && cfg.anonKey);
}

export function getProgressTableName() {
  return resolveSupabaseEnv().progressTable;
}

export function getSupabaseUrl() {
  return resolveSupabaseEnv().url;
}

export function getSupabaseAnonKey() {
  return resolveSupabaseEnv().anonKey;
}

export function getSupabaseCredentials() {
  const cfg = resolveSupabaseEnv();
  if (!cfg.url || !cfg.anonKey) return null;
  return { url: cfg.url, anonKey: cfg.anonKey };
}

export function getBackendPreference() {
  return readBackendPreference();
}

export function isBackendForcedLocal() {
  return readBackendPreference() === "local";
}

export function isBackendForcedSupabase() {
  return readBackendPreference() === "supabase";
}

// Exportamos utilidades REST para otros servicios (e.g., packsApi)
export { restFetch, restUpsert };

// Comprueba si el usuario actual es admin consultando la tabla public.admins
// Estrategia: si existe una variable VITE_ADMIN_EMAILS y coincide, retorna true inmediatamente (fallback rápido)
// Luego intenta consultar la tabla admins vía REST: /admins?select=user_id,email&...limit=1
export async function checkIsAdmin() {
  if (!isSupabaseConfigured()) return false;
  const session = await ensureValidSession();
  const email = (session?.user?.email || '').toLowerCase();
  if (!email) return false;
  const envAdmins = (env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.length && envAdmins.includes(email)) return true;
  try {
    const q = `/admins?select=user_id,email&email=eq.${encodeURIComponent(email)}&limit=1`;
    const res = await restFetch(q, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) {
      try {
        const txt = await res.text();
        console.warn('[admins] status', res.status, 'body:', txt);
      } catch {}
      return false;
    }
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.warn('[admins] error', e);
    return false;
  }
}

// Lista admins (requiere política select abierta a admins al menos)
export async function listAdmins() {
  if (!isSupabaseConfigured()) return [];
  try {
    const res = await restFetch(`/admins?select=user_id,email&order=email.asc`, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// Agrega admin por email (sin user_id si aún no ha iniciado sesión)
export async function addAdminEmail(email) {
  if (!isSupabaseConfigured()) throw new Error('NOT_CONFIGURED');
  const clean = (email || '').trim().toLowerCase();
  if (!clean) throw new Error('EMAIL_REQUIRED');
  const row = { email: clean };
  const res = await restFetch('/admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify([row])
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ADD_FAILED:${res.status}:${txt}`);
  }
  try { return await res.json(); } catch { return []; }
}

// Elimina admin por email
export async function removeAdminEmail(email) {
  if (!isSupabaseConfigured()) throw new Error('NOT_CONFIGURED');
  const clean = (email || '').trim().toLowerCase();
  if (!clean) throw new Error('EMAIL_REQUIRED');
  const res = await restFetch(`/admins?email=eq.${encodeURIComponent(clean)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`REMOVE_FAILED:${res.status}:${txt}`);
  }
  return true;
}

export function onAuth(callback) {
  if (!isSupabaseConfigured()) {
    console.warn("[supabase] Configuración incompleta. No se puede iniciar la autenticación.");
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  authListeners.add(callback);
  ensureValidSession()
    .catch(() => null)
    .finally(() => {
      callback(currentSession?.user ?? null);
    });
  return () => {
    authListeners.delete(callback);
  };
}

export async function registerEmail(email, password) {
  requireConfig();
  const response = await fetch(authUrl("/signup"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw await buildError(response, "No se pudo crear la cuenta", data);
  }
  const session = normalizeSession(data);
  if (session) {
    persistSession(session);
  }
  return { session, user: session?.user ?? data?.user ?? null };
}

export async function loginEmail(email, password) {
  requireConfig();
  const response = await fetch(authUrl("/token?grant_type=password"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw await buildError(response, "Credenciales inválidas", data);
  }
  const session = normalizeSession(data);
  if (!session) {
    throw new Error("La respuesta de Supabase no contiene una sesión válida.");
  }
  persistSession(session);
  return { session, user: session.user ?? data?.user ?? null };
}

export async function logout() {
  if (!isSupabaseConfigured()) return;
  const session = await ensureValidSession();
  if (!session?.access_token) {
    persistSession(null);
    return;
  }
  const response = await fetch(authUrl("/logout"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    throw await buildError(response, "No se pudo cerrar sesión");
  }
  persistSession(null);
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const session = await ensureValidSession();
  if (!session?.access_token) return null;
  if (session.user) return session.user;
  const response = await fetch(authUrl("/user"), {
    method: "GET",
    headers: {
      ...authHeaders(),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      persistSession(null);
      return null;
    }
    throw await buildError(response, "No se pudo obtener el usuario actual");
  }
  const data = await parseJson(response);
  if (data) {
    persistSession({ ...session, user: data });
  }
  return data;
}

export async function requireAuthUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function loadUserState(table, userId) {
  requireConfig();
  const encodedTable = encodeURIComponent(table);
  const encodedUser = encodeURIComponent(userId);
  const response = await restFetch(`/${encodedTable}?select=state&user_id=eq.${encodedUser}&limit=1`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw await buildError(response, "No se pudo leer el progreso");
  }
  const data = await parseJson(response);
  if (Array.isArray(data) && data.length > 0) {
    return data[0]?.state ?? null;
  }
  return null;
}

export async function saveUserState(table, userId, state) {
  requireConfig();
  const encodedTable = encodeURIComponent(table);
  const payload = [{
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  }];
  const response = await restFetch(`/${encodedTable}?on_conflict=user_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await buildError(response, "No se pudo guardar el progreso");
  }
}

export async function deleteUserState(table, userId) {
  requireConfig();
  const encodedTable = encodeURIComponent(table);
  const encodedUser = encodeURIComponent(userId);
  const response = await restFetch(`/${encodedTable}?user_id=eq.${encodedUser}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
  if (!response.ok && response.status !== 404) {
    throw await buildError(response, "No se pudo eliminar el progreso");
  }
}

if (isSupabaseConfigured() && currentSession) {
  ensureValidSession().catch(() => null);
}
