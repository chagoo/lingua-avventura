// Servicio de packs con 3 niveles de origen, en orden de prioridad:
// 1) Supabase (tabla vocab_words)
// 2) API local/externa (VITE_PACKS_API_URL)
// 3) JSON local (fallback offline)

import { getPack as getLocalPack, getAvailableLanguages as getLocalLangs } from "../data/packs";
import { restUpsert, isSupabaseConfigured, restFetch } from './supabase';

function buildRestBaseUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_PACKS_API_URL) {
    const envUrl = String(import.meta.env.VITE_PACKS_API_URL || "").trim();
    if (!envUrl) return null;
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return null;
}

const API_BASE_URL = buildRestBaseUrl();

function supabaseConfig() {
  if (typeof import.meta === "undefined") return null;
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const anon = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url: url.replace(/\/$/, ""), anon };
}

async function fetchFromSupabase(lang, packName, { signal } = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("SUPABASE_NOT_CONFIGURED");
  let query = `${cfg.url}/rest/v1/vocab_words?lang=eq.${encodeURIComponent(lang)}`;
  if (packName && packName !== 'default') {
    query += `&pack=eq.${encodeURIComponent(packName)}`;
  }
  const url = `${query}&select=source_word,target_word,pack,difficulty`;
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

async function fetchFromRestApi(lang, packName, { signal } = {}) {
  if (!API_BASE_URL) {
    throw new Error("REST_NOT_CONFIGURED");
  }
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

export async function fetchPack(lang, { packName = 'default', signal } = {}) {
  // 1) Supabase
  try {
    return await fetchFromSupabase(lang, packName, { signal });
  } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError' && !/aborted/i.test(e.message)) {
      console.warn("[packsApi] Supabase fallback ->", e.message);
    }
  }
  // 2) REST API
  try {
    // REST actual no soporta packName; podría ignorarse o implementarse en el futuro
    return await fetchFromRestApi(lang, packName, { signal });
  } catch (e) {
    if (
      import.meta.env?.DEV &&
      e.name !== 'AbortError' &&
      !/aborted/i.test(e.message) &&
      e.message !== 'REST_NOT_CONFIGURED'
    ) {
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
  if (!API_BASE_URL) {
    throw new Error("REST_NOT_CONFIGURED");
  }
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
    if (
      import.meta.env?.DEV &&
      e.name !== 'AbortError' &&
      !/aborted/i.test(e.message) &&
      e.message !== 'REST_NOT_CONFIGURED'
    ) {
      console.warn("[packsApi] REST langs fallback ->", e.message);
    }
  }
  // Local
  return getLocalLangs();
}

export function getApiBaseUrl() { return API_BASE_URL; }

// Obtener lista de packs (distintos) para un idioma. Devuelve ['default', ...]
export async function fetchAvailablePacks(lang, { signal } = {}) {
  // Intentar Supabase únicamente; si falla devolver ['default']
  try {
    const cfg = supabaseConfig();
    if (!cfg) throw new Error('NO_CFG');
    // Nota: algunos proyectos generan 400 con distinct=pack si no está habilitado correctamente.
    // Estrategia: solicitamos todas las filas solo con columna pack y deduplicamos en cliente.
    const url = `${cfg.url}/rest/v1/vocab_words?lang=eq.${encodeURIComponent(lang)}&select=pack`;
    const res = await fetch(url, {
      signal,
      headers: {
        apikey: cfg.anon,
        Authorization: `Bearer ${cfg.anon}`,
        Accept: 'application/json'
      }
    });
    if (!res.ok) throw new Error(`PACKS_FETCH:${res.status}`);
    const rows = await res.json();
    const set = new Set(rows.map(r => r.pack || 'default'));
    return Array.from(set);
  } catch (e) {
    if (import.meta.env?.DEV && e.name !== 'AbortError') {
      console.warn('[packsApi] packs list fallback ->', e.message);
    }
    return ['default'];
  }
}

// Parse helper: convierte líneas "palabra=traducción" -> objetos { source, target }
function parseWordLines(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const source = line.slice(0, idx).trim();
    const target = line.slice(idx + 1).trim();
    if (!source || !target) continue;
    rows.push({ source, target });
  }
  return rows;
}

// Inserta/crea un pack completo en Supabase.
// wordsInput puede ser string (textarea) o array de objetos { source, target }
// Devuelve { inserted, skipped, errors, packName }
export async function savePackWords({ lang, packName, wordsInput, difficulty }) {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!lang) throw new Error('LANG_REQUIRED');
  if (!packName) throw new Error('PACK_REQUIRED');

  let rows = Array.isArray(wordsInput) ? wordsInput : parseWordLines(wordsInput);
  // Normalizar y deduplicar por source_word
  const seen = new Set();
  rows = rows.filter(r => {
    const key = r.source.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (rows.length === 0) throw new Error('NO_VALID_WORDS');
  if (rows.length > 300) throw new Error('TOO_MANY_WORDS');

  // Normalizar dificultad textual a smallint (easy=1, medium=2, hard=3)
  let diffValue = null;
  if (typeof difficulty === 'string' && difficulty.trim()) {
    const d = difficulty.trim().toLowerCase();
    if (d === 'easy') diffValue = 1;
    else if (d === 'medium') diffValue = 2;
    else if (d === 'hard') diffValue = 3;
    else if (/^[0-9]+$/.test(d)) diffValue = Number(d);
  } else if (typeof difficulty === 'number') {
    diffValue = difficulty;
  }

  const payload = rows.map(r => ({
    lang,
    pack: packName,
    source_word: r.source,
    target_word: r.target,
    difficulty: diffValue,
  }));
  try {
    await restUpsert('vocab_words', payload, { onConflict: 'lang,pack,source_word', prefer: 'return=minimal,resolution=merge-duplicates' });
    return { inserted: payload.length, skipped: 0, errors: [], packName };
  } catch (err) {
    // Intentar detectar duplicados si el índice único existe
    const message = err.body || err.message || '';
    if (/duplicate key|unique constraint/i.test(message)) {
      return { inserted: 0, skipped: payload.length, errors: ['DUPLICATE_CONSTRAINT'], packName };
    }
    throw err;
  }
}

export { parseWordLines };

// Migrar un pack de un idioma origen a otro destino.
// Estrategia:
// 1) Intentar PATCH directo (update lang) si no existe conflicto.
// 2) Si falla por conflicto (unique), copiar filas con nuevo lang (upsert) y luego borrar las antiguas.
// Requiere políticas de UPDATE / INSERT / DELETE según el camino.
export async function migratePackLanguage({ fromLang, toLang, packName }) {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!fromLang || !toLang || !packName) throw new Error('PARAMS_REQUIRED');
  if (fromLang === toLang) return { changed: false, reason: 'SAME_LANG' };
  // 1) PATCH directo
  try {
    const patchRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(fromLang)}&pack=eq.${encodeURIComponent(packName)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ lang: toLang })
    });
    if (patchRes.ok) {
      return { changed: true, method: 'patch' };
    }
    const text = await patchRes.text();
    if (!/duplicate|unique/i.test(text)) {
      throw new Error(`PATCH_FAILED:${patchRes.status}:${text}`);
    }
    // Si hubo conflicto seguimos al plan B
  } catch (e) {
    if (!/duplicate|unique/i.test(e.message || '')) {
      // Error no relacionado a duplicados
      throw e;
    }
  }
  // 2) Copiar y borrar
  // Obtener filas actuales
  const getRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(fromLang)}&pack=eq.${encodeURIComponent(packName)}&select=lang,pack,source_word,target_word,difficulty`, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!getRes.ok) throw new Error(`FETCH_SOURCE_FAILED:${getRes.status}`);
  const data = await getRes.json();
  if (!Array.isArray(data) || data.length === 0) return { changed: false, reason: 'NO_ROWS' };
  const newRows = data.map(r => ({ ...r, lang: toLang }));
  await restUpsert('vocab_words', newRows, { onConflict: 'lang,pack,source_word', prefer: 'return=minimal,resolution=merge-duplicates' });
  const delRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(fromLang)}&pack=eq.${encodeURIComponent(packName)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!delRes.ok) throw new Error(`DELETE_OLD_FAILED:${delRes.status}`);
  return { changed: true, method: 'copy-delete', count: newRows.length };
}

// Renombrar un pack dentro del mismo idioma.
// 1) PATCH directo cambiando pack.
// 2) Si conflicto (unique), copiar con nuevo pack y borrar antiguo.
export async function renamePack({ lang, fromPack, toPack }) {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!lang || !fromPack || !toPack) throw new Error('PARAMS_REQUIRED');
  if (fromPack === toPack) return { changed: false, reason: 'SAME_PACK' };
  // PATCH directo
  try {
    const patchRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(lang)}&pack=eq.${encodeURIComponent(fromPack)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ pack: toPack })
    });
    if (patchRes.ok) return { changed: true, method: 'patch' };
    const text = await patchRes.text();
    if (!/duplicate|unique/i.test(text)) {
      throw new Error(`PATCH_FAILED:${patchRes.status}:${text}`);
    }
  } catch (e) {
    if (!/duplicate|unique/i.test(e.message || '')) throw e;
  }
  // Copiar y borrar (plan B)
  const getRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(lang)}&pack=eq.${encodeURIComponent(fromPack)}&select=lang,pack,source_word,target_word,difficulty`, { method:'GET', headers:{ Accept:'application/json' }});
  if (!getRes.ok) throw new Error(`FETCH_SOURCE_FAILED:${getRes.status}`);
  const data = await getRes.json();
  if (!Array.isArray(data) || data.length===0) return { changed:false, reason:'NO_ROWS' };
  const newRows = data.map(r => ({ ...r, pack: toPack }));
  await restUpsert('vocab_words', newRows, { onConflict:'lang,pack,source_word', prefer:'return=minimal,resolution=merge-duplicates' });
  const delRes = await restFetch(`/vocab_words?lang=eq.${encodeURIComponent(lang)}&pack=eq.${encodeURIComponent(fromPack)}`, { method:'DELETE', headers:{ Prefer:'return=minimal' }});
  if (!delRes.ok) throw new Error(`DELETE_OLD_FAILED:${delRes.status}`);
  return { changed:true, method:'copy-delete', count:newRows.length };
}
