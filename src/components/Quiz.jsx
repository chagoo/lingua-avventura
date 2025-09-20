import React, { useMemo, useState } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'

const SUBTITLE_MAP = {
  it: 'Traduce del italiano al español',
  fr: 'Traduce del francés al español',
  en: 'Traduce del inglés al español'
}

export default function Quiz({ pack, onComplete, onLearned, lang, awardXP }){
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)

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
  const select = (opt)=>{
    if(selected!==null) return; // evitar cambiar selección
    setSelected(opt);
    setShowFeedback(true);
    if(opt===q.correct){
      setScore(s=>s+1); awardXP(10); onLearned(q.prompt);
    }
    // Si es incorrecto, podemos resaltar inmediatamente: mantenemos estado
  }
  const next = ()=>{
    if(qIdx<questions.length-1){
      setQIdx(qIdx+1); setSelected(null); setShowFeedback(false);
    } else { onComplete(score) }
  }

  const isCorrect = (opt) => opt === q.correct;
  const wasWrongSelection = (opt) => selected && selected === opt && opt !== q.correct;

  return (
    <Card title={`Pregunta ${qIdx+1} / ${questions.length}`} subtitle={SUBTITLE_MAP[lang]}>
      <div className="mb-3 text-2xl font-semibold">{q.prompt}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {q.options.map(opt=> {
          const stateClass = selected === null ? '' : (
            isCorrect(opt)
              ? 'bg-emerald-100 border-emerald-500 dark:bg-emerald-900 dark:border-emerald-500 font-semibold'
              : wasWrongSelection(opt)
                ? 'bg-rose-100 border-rose-500 dark:bg-rose-900 dark:border-rose-500'
                : 'opacity-70'
          );
          return (
            <Button
              key={opt}
              variant="outline"
              disabled={selected!==null}
              className={`relative py-3 text-left transition-colors ${stateClass}`}
              onClick={()=>select(opt)}
            >
              {opt}
              {selected!==null && isCorrect(opt) && (
                <span className="absolute top-1 right-2 text-emerald-600 dark:text-emerald-400 text-sm">✓</span>
              )}
              {wasWrongSelection(opt) && (
                <span className="absolute top-1 right-2 text-rose-600 dark:text-rose-400 text-sm">✕</span>
              )}
            </Button>
          )
        })}
      </div>
      <div className="mt-4 min-h-[32px] text-sm">
        {showFeedback && selected !== null && (
          selected === q.correct
            ? <p className="text-emerald-600 dark:text-emerald-400 font-medium">¡Correcto! Pulsa Continuar.</p>
            : <p className="text-rose-600 dark:text-rose-400 font-medium">Incorrecto. Respuesta correcta marcada en verde.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={()=>speak(q.prompt, lang)}>Escuchar</Button>
        <Button onClick={next} disabled={selected===null}>Continuar</Button>
      </div>
    </Card>
  )
}
