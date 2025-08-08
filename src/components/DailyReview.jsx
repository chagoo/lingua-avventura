import React, { useMemo, useState } from 'react'
import Card from './Card'
import { speak } from '../utils/speech'

export default function DailyReview({ pack, onComplete, lang, awardXP }){
  const [qIdx, setQIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)

  const questions = useMemo(()=>{
    const base=[...pack].sort(()=>Math.random()-0.5).slice(0,5)
    return base.map(item=>({ prompt: item[lang], correct: item.es }))
  }, [pack, lang])

  const q = questions[qIdx]
  const check = ()=>{
    if(answer.trim().toLowerCase()===q.correct.toLowerCase()){ setScore(s=>s+1); awardXP(8) }
    if(qIdx<questions.length-1){ setQIdx(qIdx+1); setAnswer('') } else { onComplete(score) }
  }

  return (
    <Card title="Revisión diaria" subtitle="Escribe la traducción al español">
      <div className="text-2xl font-semibold mb-2">{q.prompt}</div>
      <div className="flex gap-2 mb-2">
        <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Escribe en español" className="flex-1 px-3 py-2 rounded-xl border border-neutral-300" />
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={check}>Comprobar</button>
      </div>
      <button className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>speak(q.prompt, lang)}>Escuchar</button>
    </Card>
  )
}
