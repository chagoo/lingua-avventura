import React, { useState } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'

export default function Flashcards({ pack, onComplete, onLearned, lang }){
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const current = pack[idx]
  const frontText = current[lang]

  const onSpeak = ()=>{ speak(frontText, lang); onLearned(frontText) }
  const next = ()=>{ if(idx < pack.length-1){ setIdx(idx+1); setFlipped(false) } else { onComplete() } }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Flashcard" subtitle="Pulsa para voltear o escuchar">
        <div className="h-48 flex items-center justify-center">
          <div className="perspective w-full h-40">
            <div
              className={`flip-card w-full h-full rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-2xl font-semibold select-none ${flipped ? 'flipped bg-amber-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'} dark:text-neutral-100`}
              onClick={()=>setFlipped(!flipped)}
            >
              {flipped ? <span>{current.es}</span> : <span>{frontText}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>setFlipped(!flipped)}>Voltear</Button>
          <Button onClick={onSpeak}>Escuchar</Button>
          <Button variant="outline" onClick={next}>Siguiente</Button>
        </div>
      </Card>
      <Card title="Consejo" subtitle="Pronunciación">
        <p className="text-neutral-700 dark:text-neutral-300">Repite en voz alta 3 veces. Imita ritmo y entonación.</p>
      </Card>
    </div>
  )
}
