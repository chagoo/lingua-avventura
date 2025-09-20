import React, { useMemo, useState } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'
import { orderByDifficulty } from '../utils/spacedRepetition'

export default function DailyReview({ pack, onComplete, lang, awardXP, progress, markError }){
  const [qIdx, setQIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState(null) // null | 'correct' | 'wrong'
  const [attempts, setAttempts] = useState(0)
  const MAX_ATTEMPTS_BEFORE_SHOW = 2; // mostrar respuesta tras 2 fallos

  const questions = useMemo(()=>{
    const ordered = orderByDifficulty(pack, progress, lang)
    const base=[...ordered].slice(0,5)
    return base.map(item=>({ prompt: item[lang], correct: item.es }))
  }, [pack, lang, progress])

  const q = questions[qIdx]
  const normalizedAnswer = answer.trim().toLowerCase();
  const isCorrect = normalizedAnswer === q.correct.toLowerCase();

  const check = () => {
    if(!answer.trim() && status !== 'correct') {
      // permitir avanzar sin escribir solo cuando ya mostramos la respuesta correcta tras exceder intentos
      if(status === 'wrong' && attempts >= MAX_ATTEMPTS_BEFORE_SHOW) {
        next();
      }
      return;
    }
    if(status === 'correct') { next(); return; }
    if(isCorrect){
      if(status !== 'correct') { setScore(s=>s+1); awardXP(8); }
      setStatus('correct');
    } else {
      setStatus('wrong');
      setAttempts(a=>a+1);
      markError && markError(q.prompt);
    }
  };

  const next = () => {
    if(qIdx < questions.length - 1){
      setQIdx(qIdx+1);
      setAnswer('');
      setStatus(null);
    } else {
      onComplete(score + (status === 'correct' ? 0 : 0)); // score ya considera aciertos
    }
  };

  const onInputChange = (e) => {
    setAnswer(e.target.value);
    if(status === 'wrong') setStatus(null); // limpiar feedback al modificar tras un fallo
  }

  return (
    <Card title="Revisión diaria" subtitle="Escribe la traducción al español">
      <div className="text-2xl font-semibold mb-2">{q.prompt}</div>
      <div className="flex gap-2 mb-2 items-start">
        <div className="flex-1 flex flex-col gap-1">
          <input
            value={answer}
            onChange={onInputChange}
            placeholder="Escribe en español"
            className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none dark:bg-neutral-800 dark:text-neutral-100 transition-colors
              ${status === 'correct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : status === 'wrong' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 animate-shake' : 'border-neutral-300 dark:border-neutral-600'}`}
            onKeyDown={e=>{ if(e.key==='Enter') check(); }}
            disabled={status==='correct'}
          />
          <div className="min-h-[20px] text-xs">
            {status === 'correct' && <span className="text-emerald-600 dark:text-emerald-400 font-medium">¡Correcto! Pulsa Siguiente.</span>}
            {status === 'wrong' && attempts < MAX_ATTEMPTS_BEFORE_SHOW && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">Incorrecto. Intenta nuevamente.</span>
            )}
            {status === 'wrong' && attempts >= MAX_ATTEMPTS_BEFORE_SHOW && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">Respuesta: <strong className="text-neutral-900 dark:text-neutral-100">{q.correct}</strong>. Puedes escribirla para reforzar o dejar vacío y avanzar.</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={check} disabled={status!=='correct' && !answer.trim() && !(status==='wrong' && attempts>=MAX_ATTEMPTS_BEFORE_SHOW)}>
            {status==='correct' ? (qIdx < questions.length-1 ? 'Siguiente' : 'Finalizar') : attempts >= MAX_ATTEMPTS_BEFORE_SHOW ? 'Continuar' : 'Comprobar'}
          </Button>
          <Button variant="outline" className="px-3" onClick={()=>speak(q.prompt, lang)}>Escuchar</Button>
        </div>
      </div>
      <div className="text-xs opacity-70">Progreso: {qIdx+1}/{questions.length} · Aciertos: {score} · Intentos: {attempts}</div>
    </Card>
  )
}
