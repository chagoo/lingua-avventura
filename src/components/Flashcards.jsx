import React, { useState, useMemo, useRef } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'
import { orderByDifficulty } from '../utils/spacedRepetition'

export default function Flashcards({ pack, onComplete, onLearned, lang, progress, onResetPack }){
  const safePack = Array.isArray(pack) ? pack.filter(Boolean) : [];
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [onlyPending, setOnlyPending] = useState(false)
  const seenRef = useRef(new Set()); // para no marcar dos veces al voltear varias veces
  const orderedAll = useMemo(()=>orderByDifficulty(safePack, progress, lang) || [], [safePack, progress, lang])
  const ordered = useMemo(()=>{
    if (!onlyPending) return orderedAll;
    return orderedAll.filter(w => {
      const key = w[lang];
      return !(progress?.wordsLearned && progress.wordsLearned[key]);
    });
  }, [orderedAll, onlyPending, progress, lang]);
  const current = ordered[idx] || null;
  const frontText = current ? current[lang] : '';
  const isLearned = frontText && progress?.wordsLearned && progress.wordsLearned[frontText];

  // Métricas: total y aprendidas (según progress.wordsLearned con clave = palabra en idioma de estudio)
  const total = ordered.length;
  const learnedCount = useMemo(()=> {
    if (!progress?.wordsLearned) return 0;
    let c = 0;
    for (const w of ordered) {
      const key = w[lang];
      if (key && progress.wordsLearned[key]) c++;
    }
    return c;
  }, [ordered, progress, lang]);
  const remaining = total - learnedCount;
  const currentNumber = idx + 1;
  const pct = total ? Math.round((learnedCount / total) * 100) : 0;

  // Reproducir audio sin marcar como aprendida para no alterar el orden ni saltar a otra palabra
  const onSpeak = ()=>{ if(!frontText) return; speak(frontText, lang); }
  const next = ()=>{ if(idx < ordered.length-1){ setIdx(idx+1); setFlipped(false) } else { onComplete(); } }

  const toggleFlip = ()=>{
    if (!current) return;
    const key = current[lang];
    const alreadyLearned = key && progress?.wordsLearned && progress.wordsLearned[key];
    const firstTime = !flipped && !alreadyLearned && !seenRef.current.has(key);
    setFlipped(f=>!f);
    if (firstTime) {
      seenRef.current.add(key);
      // marcar aprendida vía callback externo
      if (onLearned) onLearned(key);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Flashcard" subtitle="Pulsa para voltear o escuchar">
        <div className="mb-2 flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" className="accent-emerald-600" checked={onlyPending} onChange={e=>{ setIdx(0); setFlipped(false); setOnlyPending(e.target.checked); }} />
              Solo pendientes
            </label>
            {onlyPending && <span className="opacity-70">Mostrando {ordered.length} de {orderedAll.length}</span>}
            {isLearned && <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium">Aprendida</span>}
            {pack && pack.length>0 && onResetPack && (
              <button type="button" onClick={()=>{ if(window.confirm('¿Resetear progreso de este pack?')) onResetPack(); }} className="text-xs underline decoration-dotted opacity-70 hover:opacity-100">Reset pack</button>
            )}
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
            <span>Total: <strong>{total}</strong></span>
            <span>Aprendidas: <strong>{learnedCount}</strong></span>
            <span>Restantes: <strong>{remaining}</strong></span>
            {total > 0 && <span>Actual: <strong>{currentNumber}/{total}</strong></span>}
            <span>Progreso: <strong>{pct}%</strong></span>
          </div>
          <div className="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="perspective w-full h-40">
            <div
              className={`flip-card w-full h-full rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-2xl font-semibold select-none ${flipped ? 'flipped bg-amber-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'} dark:text-neutral-100`}
              onClick={toggleFlip}
            >
              {!current && <span className="text-sm opacity-60">Pack vacío</span>}
              {current && (flipped ? <span>{current.es}</span> : <span>{frontText}</span>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!current} onClick={()=>setFlipped(!flipped)}>Voltear</Button>
          <Button disabled={!current} onClick={onSpeak}>Escuchar</Button>
          <Button variant="outline" disabled={!current} onClick={next}>Siguiente</Button>
        </div>
      </Card>
      <Card title="Consejo" subtitle="Pronunciación">
        <p className="text-neutral-700 dark:text-neutral-300">Repite en voz alta 3 veces. Imita ritmo y entonación.</p>
      </Card>
    </div>
  )
}
