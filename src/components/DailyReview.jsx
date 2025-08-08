import React, { useMemo, useState } from 'react'
import Card from './Card'
import Button from './Button'
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
        <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Escribe en español" className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100" />
        <Button onClick={check}>Comprobar</Button>
      </div>
      <Button variant="outline" className="px-3" onClick={()=>speak(q.prompt, lang)}>Escuchar</Button>
    </Card>
  )
}
