// Servicio de packs con 3 niveles de origen, en orden de prioridad:
// 1) Supabase (tabla vocab_words)
// 2) API local/externa (VITE_PACKS_API_URL)
// 3) JSON local (fallback offline)

import { getPack as getLocalPack, getAvailableLanguages as getLocalLangs } from "../data/packs";

const DEFAULT_BASE_URL = "http://localhost:4000";

function buildRestBaseUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_PACKS_API_URL) {
    const envUrl = import.meta.env.VITE_PACKS_API_URL;
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return DEFAULT_BASE_URL;
}

const API_BASE_URL = buildRestBaseUrl();

function supabaseConfig() {
  if (typeof import.meta === "undefined") return null;
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const anon = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url: url.replace(/\/$/, ""), anon };
}

async function fetchFromSupabase(lang, { signal } = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("SUPABASE_NOT_CONFIGURED");
  const url = `${cfg.url}/rest/v1/vocab_words?lang=eq.${encodeURIComponent(lang)}&select=source_word,target_word,pack,difficulty`;
  const res = await fetch(url, {
    signal,
    headers: {
      apikey: cfg.anon,
      Authorization: `Bearer ${cfg.anon}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`SUPABASE_FETCH_ERROR:${res.status}`);
  }
  const rows = await res.json();
  // Formato esperado por la app: [{ <lang>: source_word, es: target_word }]
  return rows.map(r => ({ [lang]: r.source_word, es: r.target_word }));
}

async function fetchFromRestApi(lang, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/packs/${encodeURIComponent(lang)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) {
    throw new Error(`REST_NOT_FOUND:${lang}`);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`REST_ERROR:${text || response.statusText}`);
  }
  const body = await response.json();
  return Array.isArray(body.words) ? body.words : body;
}

export async function fetchPack(lang, { signal } = {}) {
  // 1) Supabase
  try {
    return await fetchFromSupabase(lang, { signal });
  } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError' && !/aborted/i.test(e.message)) {
      console.warn("[packsApi] Supabase fallback ->", e.message);
    }
  }
  // 2) REST API
  try {
    return await fetchFromRestApi(lang, { signal });
  } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError' && !/aborted/i.test(e.message)) {
      console.warn("[packsApi] REST API fallback ->", e.message);
    }
  }
  // 3) Local JSON
  return getLocalPack(lang);
}

async function fetchSupabaseLanguages({ signal } = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("SUPABASE_NOT_CONFIGURED");
  const url = `${cfg.url}/rest/v1/vocab_words?select=lang&distinct=lang`;
  const res = await fetch(url, {
    signal,
    headers: {
      apikey: cfg.anon,
      Authorization: `Bearer ${cfg.anon}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`SUPABASE_LANGS_ERROR:${res.status}`);
  const rows = await res.json();
  // Supabase devuelve array de objetos { lang: 'it' }
  const set = new Set(rows.map(r => r.lang).filter(Boolean));
  return Array.from(set);
}

async function fetchRestLanguages({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/packs`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`REST_LANGS_ERROR:${text || response.statusText}`);
  }
  const body = await response.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.languages)) return body.languages;
  if (Array.isArray(body.available)) return body.available;
  return Object.keys(body);
}

export async function fetchAvailableLanguages({ signal } = {}) {
  // Supabase primero
  try { return await fetchSupabaseLanguages({ signal }); } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError' && !/aborted/i.test(e.message)) {
      console.warn("[packsApi] Supabase langs fallback ->", e.message);
    }
  }
  // REST API
  try { return await fetchRestLanguages({ signal }); } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError' && !/aborted/i.test(e.message)) {
      console.warn("[packsApi] REST langs fallback ->", e.message);
    }
  }
  // Local
  return getLocalLangs();
}

export function getApiBaseUrl() { return API_BASE_URL; }
