const DEFAULT_BASE_URL = "http://localhost:4000";

function buildBaseUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_PACKS_API_URL) {
    const envUrl = import.meta.env.VITE_PACKS_API_URL;
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return DEFAULT_BASE_URL;
}

const API_BASE_URL = buildBaseUrl();

export async function fetchPack(lang, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/packs/${encodeURIComponent(lang)}`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    throw new Error(`Paquete "${lang}" no encontrado en la API`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error solicitando el paquete "${lang}": ${text || response.statusText}`);
  }

  const body = await response.json();
  const words = Array.isArray(body.words) ? body.words : body;
  return words;
}

export async function fetchAvailableLanguages({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/packs`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error solicitando listado de paquetes: ${text || response.statusText}`);
  }

  const body = await response.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.languages)) return body.languages;
  if (Array.isArray(body.available)) return body.available;
  return Object.keys(body);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
