import React, { useState, useMemo } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'
import { orderByDifficulty } from '../utils/spacedRepetition'

export default function Flashcards({ pack, onComplete, onLearned, lang, progress }){
  const safePack = Array.isArray(pack) ? pack.filter(Boolean) : [];
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const ordered = useMemo(()=>orderByDifficulty(safePack, progress, lang) || [], [safePack, progress, lang])
  const current = ordered[idx] || null;
  const frontText = current ? current[lang] : '';

  const onSpeak = ()=>{ if(!frontText) return; speak(frontText, lang); onLearned(frontText) }
  const next = ()=>{ if(idx < ordered.length-1){ setIdx(idx+1); setFlipped(false) } else { onComplete(); } }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Flashcard" subtitle="Pulsa para voltear o escuchar">
        <div className="h-48 flex items-center justify-center">
          <div className="perspective w-full h-40">
            <div
              className={`flip-card w-full h-full rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-2xl font-semibold select-none ${flipped ? 'flipped bg-amber-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'} dark:text-neutral-100`}
              onClick={()=>setFlipped(!flipped)}
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
