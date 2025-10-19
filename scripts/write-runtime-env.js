#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'public', 'runtime-env.js');

const envKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PROGRESS_TABLE',
  'VITE_PACKS_API_URL',
  'VITE_PACKS_API_ALLOW_LOOPBACK',
  'VITE_ADMIN_EMAILS',
  'VITE_BACKEND'
];

const aggregatedEnvKeys = [
  'LINGUA_AVVENTURE',
  'LINGUA_AVVENTURA',
  'SUPABASE_CONFIG',
  'APP_CONFIG',
  'LINGUA_CONFIG'
];

function toCamelCase(value) {
  if (!value) return '';
  return String(value)
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((segment, index) => {
      const lower = segment.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function decodeBase64(str) {
  if (typeof str !== 'string' || !str) return null;
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (_) {
    return null;
  }
}

function parseAggregatedCandidate(candidate) {
  if (!candidate) return null;
  if (typeof candidate === 'object') return candidate;
  if (typeof candidate !== 'string') return null;

  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const tryParseJson = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (_) {
      // ignore
    }
    return null;
  };

  const jsonParsed = tryParseJson(trimmed);
  if (jsonParsed) return jsonParsed;

  const decoded = decodeBase64(trimmed);
  if (decoded) {
    const decodedJson = tryParseJson(decoded.trim());
    if (decodedJson) return decodedJson;
  }

  const kvPairs = {};
  trimmed
    .split(/[\n\r;,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(/[:=]/);
      if (!key || rest.length === 0) return;
      const value = rest.join(':=');
      kvPairs[key.trim()] = value.trim();
    });

  if (Object.keys(kvPairs).length > 0) {
    return kvPairs;
  }

  const pipeParts = trimmed.split('|');
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

function collectAggregatedGroups() {
  const groups = [];

  aggregatedEnvKeys.forEach((key) => {
    const parsed = parseAggregatedCandidate(process.env[key]);
    if (parsed && typeof parsed === 'object') {
      groups.push(parsed);
      const nestedCandidates = [
        parsed.supabase,
        parsed.supabaseConfig,
        parsed.supabase_credentials,
        parsed.supabaseSettings,
        parsed.credentials
      ];
      nestedCandidates.forEach((candidate) => {
        if (candidate && typeof candidate === 'object') {
          groups.push(candidate);
        }
      });
    }
  });

  return groups;
}

function normalizeEnvValue(value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'undefined' || lower === 'null') return undefined;
  return trimmed;
}

const aggregatedGroups = collectAggregatedGroups();

const aggregatedAliases = {
  VITE_SUPABASE_URL: ['SUPABASE_URL', 'supabaseUrl', 'url', 'projectUrl'],
  VITE_SUPABASE_ANON_KEY: ['SUPABASE_ANON_KEY', 'supabaseAnonKey', 'anonKey', 'key'],
  VITE_SUPABASE_PROGRESS_TABLE: ['SUPABASE_PROGRESS_TABLE', 'progressTable', 'table']
};

function readAggregatedValue(key) {
  const variants = [key];

  if (aggregatedAliases[key]) {
    variants.push(...aggregatedAliases[key]);
  }

  if (key.startsWith('VITE_')) {
    const bare = key.slice(5);
    if (bare) {
      variants.push(bare);
      variants.push(toCamelCase(bare));
      variants.push(bare.toLowerCase());
    }
  }

  for (const group of aggregatedGroups) {
    for (const variant of variants) {
      if (group && group[variant] != null) {
        return String(group[variant]);
      }
      const camelVariant = toCamelCase(variant);
      if (!camelVariant) continue;
      for (const candidateKey of Object.keys(group || {})) {
        if (toCamelCase(candidateKey) === camelVariant && group[candidateKey] != null) {
          return String(group[candidateKey]);
        }
      }
    }
  }

  return undefined;
}

const collected = {};
for (const key of envKeys) {
  const direct = normalizeEnvValue(process.env[key]);
  const value = direct != null ? direct : normalizeEnvValue(readAggregatedValue(key));
  if (value != null) {
    collected[key] = value;
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

const banner = '// Archivo autogenerado por scripts/write-runtime-env.js\n';
const payload = Object.keys(collected).length ? JSON.stringify(collected, null, 2) : '{}';
const body = `window.__ENV__ = Object.assign(window.__ENV__ || {}, ${payload});\n`;

try {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, banner + body);
  if (Object.keys(collected).length) {
    console.log('[runtime-env] runtime-env.js generado con claves:', Object.keys(collected).join(', '));
  } else {
    console.log('[runtime-env] runtime-env.js generado sin variables (stub vacío).');
  }
} catch (err) {
  console.error('[runtime-env] Error escribiendo runtime-env.js', err);
  process.exit(1);
}
