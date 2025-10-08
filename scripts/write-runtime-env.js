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

const collected = {};
for (const key of envKeys) {
  const value = process.env[key];
  if (value != null && String(value).trim() !== '') {
    collected[key] = String(value);
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
