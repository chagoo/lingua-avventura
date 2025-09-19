import React, { useState, useMemo } from 'react';
import Button from './Button';
import Card from './Card';
import Chip from './Chip';
import { savePackWords, parseWordLines, migratePackLanguage, renamePack } from '../services/packsApi';
import { fetchAvailableLanguages } from '../services/packsApi';

export default function PackManager({ onCreated, onMigrated, onRenamed }) {
  const [lang, setLang] = useState('it');
  const [packName, setPackName] = useState('lesson1');
  const [text, setText] = useState('ciao=hola\nacqua=agua');
  const [difficulty, setDifficulty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [langs, setLangs] = useState(['it','fr','en']);
  const [showPreview, setShowPreview] = useState(true);
  // Migración de idioma
  const [migrateTarget, setMigrateTarget] = useState('en');
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState(null);
  // Renombrar pack
  const [renameTarget, setRenameTarget] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameMsg, setRenameMsg] = useState(null);

  // Cargar lenguajes disponibles on-demand (botón)
  async function refreshLangs() {
    try {
      const list = await fetchAvailableLanguages({});
      if (Array.isArray(list) && list.length) setLangs(prev => Array.from(new Set([...prev, ...list])));
    } catch {/* ignore */}
  }

  const rows = useMemo(()=> parseWordLines(text), [text]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setResult(null);
    if (!lang || !packName) { setError('Idioma y nombre del pack requeridos'); return; }
    if (rows.length === 0) { setError('No hay líneas válidas'); return; }
    setSubmitting(true);
    try {
      const res = await savePackWords({ lang, packName, wordsInput: rows, difficulty: difficulty || undefined });
      setResult(res);
      if (onCreated) onCreated({ lang, packName, count: rows.length });
    } catch (err) {
      setError(err.message || 'Error guardando pack');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMigrate() {
    setMigrateMsg(null);
    if (!packName) { setMigrateMsg('Pack requerido'); return; }
    if (!lang || !migrateTarget) { setMigrateMsg('Idiomas requeridos'); return; }
    if (lang === migrateTarget) { setMigrateMsg('Ya está en ese idioma'); return; }
    setMigrating(true);
    try {
      const res = await migratePackLanguage({ fromLang: lang, toLang: migrateTarget, packName });
      setMigrateMsg(`Migrado (${res.method || 'ok'})`);
      // Actualizar estado local: cambiamos el idioma actual al nuevo
      setLang(migrateTarget);
      if (onMigrated) onMigrated({ oldLang: lang, newLang: migrateTarget, packName });
    } catch (err) {
      setMigrateMsg(err.message || 'Error migrando');
    } finally {
      setMigrating(false);
    }
  }

  async function handleRename() {
    setRenameMsg(null);
    const toPack = (renameTarget || '').trim();
    if (!packName) { setRenameMsg('Pack actual requerido'); return; }
    if (!toPack) { setRenameMsg('Nuevo nombre requerido'); return; }
    if (toPack === packName) { setRenameMsg('Es el mismo nombre'); return; }
    setRenaming(true);
    try {
      const res = await renamePack({ lang, fromPack: packName, toPack });
      setRenameMsg(`Renombrado (${res.method || 'ok'})`);
      setPackName(toPack);
      if (onRenamed) onRenamed({ lang, fromPack: packName, toPack });
    } catch (err) {
      setRenameMsg(err.message || 'Error renombrando');
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Gestor de Packs" subtitle="Crear/actualizar packs por lección">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="flex flex-col text-sm gap-1">Idioma
              <div className="flex gap-2">
                <select value={lang} onChange={e=>setLang(e.target.value)} className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700">
                  {langs.map(l=> <option key={l} value={l}>{l}</option>)}
                </select>
                <Button type="button" variant="outline" onClick={refreshLangs}>Refrescar</Button>
              </div>
            </label>
            <label className="flex flex-col text-sm gap-1">Nombre del pack
              <input value={packName} onChange={e=>setPackName(e.target.value)} placeholder="lesson2" className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" />
            </label>
            <label className="flex flex-col text-sm gap-1">Dificultad (opcional)
              <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700">
                <option value="">(ninguna)</option>
                <option value="easy">easy (1)</option>
                <option value="medium">medium (2)</option>
                <option value="hard">hard (3)</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Guardando…' : 'Guardar pack'}</Button>
            </div>
          </div>
          <label className="flex flex-col text-sm gap-1">Palabras (formato palabra=traduccion, una por línea)
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={8} className="font-mono text-xs px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" />
          </label>
          <div className="flex items-center gap-4">
            <Chip>{rows.length} palabras</Chip>
            <Button type="button" variant="outline" onClick={()=>setShowPreview(p=>!p)}>{showPreview ? 'Ocultar preview' : 'Ver preview'}</Button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error.startsWith('UPSERT_FAILED:400') ? 'Error 400: verifica políticas RLS (INSERT/UPDATE) y el índice único (lang, pack, source_word).' : error}</p>}
          {result && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Insertadas {result.inserted}, pack: {result.packName}</p>
          )}
        </form>
      </Card>
      {showPreview && (
        <Card title="Preview" subtitle="Se insertará / actualizará (upsert)">
          {rows.length === 0 && <p className="text-sm opacity-70">Sin filas válidas.</p>}
          {rows.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-700">
                  <th className="text-left p-2 border border-neutral-300 dark:border-neutral-600">#</th>
                  <th className="text-left p-2 border border-neutral-300 dark:border-neutral-600">Source</th>
                  <th className="text-left p-2 border border-neutral-300 dark:border-neutral-600">Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-neutral-800 dark:even:bg-neutral-700">
                    <td className="p-1 border border-neutral-300 dark:border-neutral-600 w-8">{i+1}</td>
                    <td className="p-1 border border-neutral-300 dark:border-neutral-600">{r.source}</td>
                    <td className="p-1 border border-neutral-300 dark:border-neutral-600">{r.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      <Card title="Formato" subtitle="Guía rápida">
        <ul className="text-xs list-disc ml-5 space-y-1">
          <li>Una línea por palabra.</li>
          <li>Separador obligatorio: signo igual (=).</li>
          <li>Ignora líneas vacías o que empiezan con #.</li>
          <li>Se hace upsert: si ya existe (lang, pack, source_word) se actualiza target.</li>
          <li>Dificultad (select) se guarda como número: easy=1, medium=2, hard=3.</li>
        </ul>
      </Card>
      <Card title="Migrar idioma del pack" subtitle="Mover todas las palabras a otro idioma">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="flex flex-col text-sm gap-1">
            <span>Idioma destino</span>
            <select value={migrateTarget} onChange={e=>setMigrateTarget(e.target.value)} className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700">
              {langs.filter(l=>l!==lang).map(l=> <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <Button type="button" onClick={handleMigrate} disabled={migrating}>
            {migrating ? 'Migrando…' : `Migrar ${packName} → ${migrateTarget}`}
          </Button>
          {migrateMsg && <span className="text-xs whitespace-pre-wrap opacity-80">{migrateMsg}</span>}
        </div>
        <p className="text-xs mt-2 opacity-70">Si hay conflictos (palabra ya existe en destino) se hace merge (target & difficulty se actualizan si procede). Requiere políticas RLS de UPDATE/INSERT/DELETE.</p>
      </Card>
      <Card title="Renombrar pack" subtitle="Cambiar identificador del pack (misma lengua)">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="flex flex-col text-sm gap-1">
            <span>Nuevo nombre</span>
            <input value={renameTarget} onChange={e=>setRenameTarget(e.target.value)} placeholder="lesson2" className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" />
          </div>
          <Button type="button" onClick={handleRename} disabled={renaming}>{renaming ? 'Renombrando…' : `Renombrar ${packName}`}</Button>
          {renameMsg && <span className="text-xs opacity-80">{renameMsg}</span>}
        </div>
        <p className="text-xs mt-2 opacity-70">Usa nombres consistentes (lesson1, lesson2...). Si existe ya, se hace merge (actualiza target/difficulty). Requiere políticas de UPDATE/INSERT/DELETE.</p>
      </Card>
    </div>
  );
}
