import React, { useMemo, useState } from 'react'
import Card from './Card'
import { speak } from '../services/speech'

const SUBTITLE_MAP = {
  it: 'Traduce del italiano al español',
  fr: 'Traduce del francés al español',
  en: 'Traduce del inglés al español'
}

export default function Quiz({ pack, onComplete, onLearned, lang, awardXP }){
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)

  const questions = useMemo(()=>{
    const base=[...pack]
    const shuffled=base.sort(()=>Math.random()-0.5).slice(0,8)
    return shuffled.map(item=>{
      const correct=item.es
      const options=new Set([correct])
      while(options.size<4){ options.add(base[Math.floor(Math.random()*base.length)].es) }
      return { prompt: item[lang], correct, options: Array.from(options).sort(()=>Math.random()-0.5) }
    })
  }, [pack, lang])

  const q = questions[qIdx]
  const select = (opt)=>{ setSelected(opt); if(opt===q.correct){ setScore(s=>s+1); awardXP(10); onLearned(q.prompt) } }
  const next = ()=>{ if(qIdx<questions.length-1){ setQIdx(qIdx+1); setSelected(null) } else { onComplete(score) } }

  return (
    <Card title={`Pregunta ${qIdx+1} / ${questions.length}`} subtitle={SUBTITLE_MAP[lang]}>
      <div className="mb-3 text-2xl font-semibold">{q.prompt}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {q.options.map(opt=> (
          <button key={opt} className={`px-4 py-3 rounded-xl border text-left ${selected===opt ? (opt===q.correct? 'bg-emerald-100 border-emerald-400':'bg-rose-100 border-rose-400'): 'bg-white border-neutral-200 hover:bg-neutral-50'}`} onClick={()=>select(opt)}>{opt}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>speak(q.prompt, lang)}>Escuchar</button>
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={next}>Continuar</button>
      </div>
    </Card>
  )
}
