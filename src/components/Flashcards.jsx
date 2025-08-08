import React, { useState } from 'react'
import Card from './Card'
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
          <div className={`w-full h-40 rounded-2xl border border-neutral-200 flex items-center justify-center text-2xl font-semibold select-none ${flipped? 'bg-amber-50':'bg-white'}`} onClick={()=>setFlipped(!flipped)}>
            {flipped ? <span>{current.es}</span> : <span>{frontText}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>setFlipped(!flipped)}>Voltear</button>
          <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={onSpeak}>Escuchar</button>
          <button className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={next}>Siguiente</button>
        </div>
      </Card>
      <Card title="Consejo" subtitle="Pronunciación">
        <p className="text-neutral-700">Repite en voz alta 3 veces. Imita ritmo y entonación.</p>
      </Card>
    </div>
  )
}
