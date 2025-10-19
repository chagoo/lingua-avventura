#!/usr/bin/env node

/**
 * Script de utilidad para validar la configuración y la conectividad con Supabase.
 *
 * El objetivo es ofrecer una "hoja" automatizada con los pasos mínimos de
 * verificación, dejando además un registro estructurado con los resultados para
 * poder diagnosticar incidencias recurrentes.
 */

const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(process.cwd(), "logs");
const LOCAL_CONFIG_FILE = path.join(process.cwd(), "config", "supabase.config.json");

function loadLocalConfig() {
  try {
    const raw = fs.readFileSync(LOCAL_CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(
        `[supabase-validation] No se pudo leer ${path.relative(process.cwd(), LOCAL_CONFIG_FILE)}: ${error.message}`
      );
    }
  }
  return {};
}

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function createLogEntry() {
  return {
    timestamp: new Date().toISOString(),
    steps: [],
  };
}

function pushStep(logEntry, { name, status, details }) {
  logEntry.steps.push({ name, status, details });
}

function saveLog(logEntry) {
  ensureLogsDir();
  const fileName = `supabase-validation-${Date.now()}.json`;
  const filePath = path.join(LOGS_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2), "utf8");
  return filePath;
}

function parseAggregatedConfig(candidate) {
  if (!candidate) return {};
  if (typeof candidate === "object") return candidate;

  const value = String(candidate).trim();
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch (err) {
    // Ignoramos, probamos otros formatos
  }

  const base64Match = value.match(/^[A-Za-z0-9+/=]+$/);
  if (base64Match) {
    try {
      const decoded = Buffer.from(value, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (err) {
      // No es JSON válido
    }
  }

  const pairs = {};
  value
    .split(/[\n\r;,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(/[:=]/);
      if (!key || rest.length === 0) return;
      pairs[key.trim()] = rest.join(":=").trim();
    });

  if (Object.keys(pairs).length > 0) {
    return pairs;
  }

  return {};
}

function normalize(value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (["undefined", "null"].includes(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

function resolveConfig() {
  const env = process.env || {};

  const localConfig = loadLocalConfig();

  const aggregatedCandidates = [
    env.LINGUA_AVVENTURE,
    env.LINGUA_AVVENTURA,
    env.SUPABASE_CONFIG,
    env.APP_CONFIG,
    env.LINGUA_CONFIG,
    localConfig,
  ]
    .map(parseAggregatedConfig)
    .reduce((acc, current) => Object.assign(acc, current), {});

  const read = (...keys) => {
    for (const key of keys) {
      const direct = normalize(env[key]);
      if (direct) return direct;
      const aggregated = normalize(aggregatedCandidates[key]);
      if (aggregated) return aggregated;
    }
    return undefined;
  };

  const url = read("VITE_SUPABASE_URL", "SUPABASE_URL", "supabaseUrl", "url");
  const anonKey = read(
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "supabaseAnonKey",
    "anonKey",
    "key"
  );
  const progressTable =
    read(
      "VITE_SUPABASE_PROGRESS_TABLE",
      "SUPABASE_PROGRESS_TABLE",
      "progressTable",
      "table"
    ) || "user_progress";

  return { url, anonKey, progressTable };
}

async function checkConnectivity(url, anonKey) {
  if (!url) {
    return {
      status: "failed",
      details: "No se puede validar la conectividad sin una URL de Supabase.",
    };
  }

  try {
    const endpoint = new URL("/auth/v1/health", url).toString();
    const response = await fetch(endpoint, {
      headers: anonKey ? { apikey: anonKey } : undefined,
    });

    if (!response.ok) {
      return {
        status: "failed",
        details: `El endpoint de salud respondió con el código ${response.status}.`,
      };
    }

    const payload = await response.json().catch(() => null);
    return {
      status: "passed",
      details: payload ? JSON.stringify(payload) : "Respuesta correcta del endpoint de salud.",
    };
  } catch (error) {
    return {
      status: "failed",
      details: `Error al conectar con Supabase: ${error.message}`,
    };
  }
}

(async () => {
  const logEntry = createLogEntry();

  const { url, anonKey, progressTable } = resolveConfig();

  pushStep(logEntry, {
    name: "Variables de entorno",
    status: url && anonKey ? "passed" : "failed",
    details: `URL: ${url || "(no encontrada)"} | Anon Key: ${anonKey ? "(detectada)" : "(no encontrada)"} | Tabla de progreso: ${progressTable}`,
  });

  if (!url || !anonKey) {
    pushStep(logEntry, {
      name: "Conectividad",
      status: "blocked",
      details: "Faltan credenciales obligatorias para realizar la comprobación.",
    });
  } else {
    const connectivity = await checkConnectivity(url, anonKey);
    pushStep(logEntry, {
      name: "Conectividad",
      status: connectivity.status,
      details: connectivity.details,
    });
  }

  const logPath = saveLog(logEntry);

  console.log("Hoja de validación de Supabase");
  console.log("===============================");
  logEntry.steps.forEach((step) => {
    console.log(`- ${step.name}: ${step.status}`);
    console.log(`  Detalles: ${step.details}`);
  });
  console.log(`\nRegistro guardado en: ${path.relative(process.cwd(), logPath)}`);
})();

