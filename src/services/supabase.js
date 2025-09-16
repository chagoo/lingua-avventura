const env = typeof import.meta !== "undefined" ? import.meta.env ?? {} : {};
const rawUrl = env.VITE_SUPABASE_URL;
const SUPABASE_URL = rawUrl ? rawUrl.replace(/\/$/, "") : undefined;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const PROGRESS_TABLE = env.VITE_SUPABASE_PROGRESS_TABLE || "user_progress";

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
  return {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

function restHeaders(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
}

function authUrl(path) {
  return `${SUPABASE_URL}/auth/v1${path}`;
}

function restUrl(path) {
  return `${SUPABASE_URL}/rest/v1${path}`;
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

function requireConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getProgressTableName() {
  return PROGRESS_TABLE;
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
