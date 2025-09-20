import React, { useEffect, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import Card from './Card';
import Button from './Button';
import { speak } from '../utils/speech';

// Fases: Comprensión (L2->ES) y Producción (ES->L2) con reintentos, racha y XP
// Flujo:
//  - Se generan "turnos" a partir de frases/palabras del pack.
//  - Cada turno muestra la frase en L2 y 3-4 opciones en español (1 correcta + distractores).
//  - Feedback inmediato; si falla, el turno se encola para reintento final (sin volver a mostrar distractores repetidos si se quiere mejorar luego).
//  - XP: +4 acierto directo, +1 si se acierta en reintento. Bonus final proporcional.

function buildTurns(pack, lang, mode='mcq', maxTurns = 8) {
  const items = (Array.isArray(pack) ? pack : []).filter(w => w && w[lang] && w.es);
  // Barajar
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const base = shuffled.slice(0, maxTurns);
  const poolES = items.map(w => w.es);
  const turns = base.map((w, i) => {
    const isMcq = mode === 'mcq';
    const correct = isMcq ? w.es : w[lang];
    let options = [];
    if (isMcq) {
      const distractors = poolES.filter(t => t !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
      options = [...distractors, correct].sort(() => Math.random() - 0.5);
    }
    return {
      id: i + '_' + w[lang],
      source: w[lang],
      lang,
      correct,          // correcto en target (ES si mcq, L2 si producción)
      native: w.es,      // español siempre
      target: w[lang],   // L2 siempre
      mode,              // 'mcq' | 'produce'
      options, // siempre array para evitar null en renders intermedios
      attempts: 0,
      done: false,
      retry: false,
    };
  });
  return turns;
}

export default function MiniDialogues({ pack, lang, onComplete, awardXP }) {
  const { progress, updateProgress } = useProgress();
  const savedMode = progress?.settings?.dialoguesMode;
  const [mode, setMode] = useState('mcq'); // 'mcq' (comprensión) | 'produce'
  const [turns, setTurns] = useState(() => buildTurns(pack, lang, savedMode || 'mcq'));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // opción elegida
  const [phase, setPhase] = useState('question'); // 'question' | 'feedback' | 'finished'
  const [queue, setQueue] = useState([]); // turnos fallados para reintento
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [inputValue, setInputValue] = useState('');

  // Re-generar si cambia pack/lang
  useEffect(() => {
    setTurns(buildTurns(pack, lang, mode));
    setIndex(0);
    setSelected(null);
    setPhase('question');
    setQueue([]);
    setCorrectCount(0);
    setTotalAnswered(0);
    setStreak(0);
    setBestStreak(0);
    setXpEarned(0);
    setInputValue('');
  }, [pack, lang, mode]);

  // Inicializar modo desde progreso guardado
  useEffect(()=>{
    if(savedMode && savedMode !== mode) setMode(savedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMode]);

  // Persistir modo cuando cambie (solo si difiere de lo guardado)
  useEffect(()=>{
    if(savedMode === mode) return;
    updateProgress(draft => {
      draft.settings = draft.settings || {};
      draft.settings.dialoguesMode = mode;
    });
  }, [mode, savedMode, updateProgress]);

  const current = turns[index];
  const totalPlanned = turns.length + queue.length; // cola futura incluida
  const progressRatio = totalPlanned > 0 ? Math.min(totalAnswered, turns.length + queue.length) / totalPlanned : 0;

  function normalize(str){
    return (str||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\sáéíóúüñ]/gi,'')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ') // espacios múltiples
      .trim();
  }

  function grade(answer){
    const expected = normalize(current.correct);
    const given = normalize(answer);
    if (expected === given) return { ok: true, fuzzy: false };
    if (expected.length > 4) {
      const dist = levenshtein(expected, given);
      if (dist === 1) return { ok: true, fuzzy: true };
    }
    return { ok: false, fuzzy: false };
  }

  function levenshtein(a,b){
    if(a===b) return 0;
    const al=a.length, bl=b.length;
    if(!al) return bl; if(!bl) return al;
    const dp = Array.from({length: al+1}, (_,i)=> i===0? Array.from({length: bl+1},(_,j)=>j): [i]);
    for(let i=1;i<=al;i++){
      for(let j=1;j<=bl;j++){
        if(!dp[i]) dp[i]=[];
        const cost = a[i-1]===b[j-1]?0:1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + cost
        );
      }
    }
    return dp[al][bl];
  }

  function handleSelect(opt) {
    if (phase !== 'question' || current.mode !== 'mcq') return;
    setSelected(opt);
    setPhase('feedback');
    setTotalAnswered(a => a + 1);
    const isCorrect = opt === current.correct;
    registerResult(isCorrect);
  }

  function handleProduceSubmit(){
    if (phase !== 'question' || current.mode !== 'produce') return;
    const ans = inputValue;
    setSelected(ans);
    setPhase('feedback');
    setTotalAnswered(a => a + 1);
    const result = grade(ans);
    registerResult(result.ok, result.fuzzy);
  }

  function registerResult(isCorrect, fuzzy=false){
    setTurns(t => {
      const copy = [...t];
      copy[index] = { ...copy[index], done: true, attempts: copy[index].attempts + 1 };
      return copy;
    });
    if (isCorrect) {
      const firstTry = current.attempts === 0;
      setCorrectCount(c => c + 1);
      setStreak(s => { const ns = s + 1; setBestStreak(b => ns > b ? ns : b); return ns; });
      let base = current.mode === 'mcq' ? (firstTry ? 4 : 1) : (firstTry ? 6 : 2);
      if(fuzzy && firstTry) base = Math.max(2, Math.floor(base * 0.6)); // penaliza leve
      else if(fuzzy && !firstTry) base = Math.max(1, Math.floor(base * 0.5));
      const streakBonus = firstTry ? Math.min(4, Math.floor((streak + 1)/3)) : 0;
      const totalGain = base + streakBonus;
      setXpEarned(x => x + totalGain);
      awardXP(totalGain);

      // Persistir métricas acumuladas por modo
      updateProgress(draft => {
        draft.stats = draft.stats || {};
        draft.stats.dialogues = draft.stats.dialogues || { mcq: { correct:0, attempts:0, bestStreak:0 }, produce: { correct:0, attempts:0, bestStreak:0 } };
        const bucket = draft.stats.dialogues[current.mode];
        bucket.correct += 1;
        bucket.attempts += 1; // intento exitoso (sólo contamos los que terminan correctos)
        if (streak + 1 > bucket.bestStreak) bucket.bestStreak = streak + 1;
        bucket.fuzzy = bucket.fuzzy || 0;
        if (fuzzy) bucket.fuzzy += 1;
      });
    } else {
      setStreak(0);
      // Registrar intento fallido
      updateProgress(draft => {
        draft.stats = draft.stats || {};
        draft.stats.dialogues = draft.stats.dialogues || { mcq: { correct:0, attempts:0, bestStreak:0 }, produce: { correct:0, attempts:0, bestStreak:0 } };
        const bucket = draft.stats.dialogues[current.mode];
        bucket.attempts += 1;
      });
      setQueue(q => q.some(qt => qt.id === current.id) ? q : [...q, { ...current, retry: true }]);
    }
  }

  function goNext() {
    if (phase !== 'feedback') return;
  setSelected(null);
    setPhase('question');
  setInputValue('');
    // Avanzar
    if (index < turns.length - 1) {
      setIndex(i => i + 1);
    } else if (queue.length > 0) {
      // Reemplazar turns por la cola y vaciarla
      setTurns(queue.map((t, i) => ({ ...t, attempts: t.attempts + 1, done: false })));
      setQueue([]);
      setIndex(0);
    } else {
      // Final
  const totalItems = correctCount + (turns.length - (index+1)) + queue.length; // aproximación
  const pct = turns.length ? Math.round((correctCount / (correctCount + (totalItems - correctCount))) * 100) : 0;
      const completionBonus = Math.max(2, Math.round(correctCount * 0.4));
      const streakBonus = Math.min(10, Math.round(bestStreak * 0.5));
      const finalBonus = completionBonus + streakBonus;
      setXpEarned(x => x + finalBonus);
      awardXP(finalBonus);
      setPhase('finished');
      onComplete && onComplete(pct);
    }
  }

  if (!current && phase !== 'finished') {
    return <Card title="Mini diálogos" subtitle="Preparando...">Cargando...</Card>;
  }

  if (phase === 'finished') {
    const total = correctCount;
    const stats = progress?.stats?.dialogues;
    return (
      <Card title="Mini diálogos" subtitle="Resumen">
        <div className="space-y-2 text-sm mb-4">
          <p>Completado. Aciertos: <strong>{total}</strong></p>
          <p>Racha máxima: <strong>{bestStreak}</strong></p>
          <p>XP ganado: <strong>{xpEarned}</strong></p>
          {stats && (
            <div className="mt-2 space-y-1">
              {['mcq','produce'].map(m => {
                const s = stats[m];
                if(!s) return null;
                return <p key={m} className="text-xs opacity-70">{m==='mcq'?'Comprensión':'Producción'}: {s.correct}/{s.attempts} correctos · Mejor racha: {s.bestStreak}{s.fuzzy?` · Fuzzy: ${s.fuzzy}`:''}</p>;
              })}
            </div>
          )}
        </div>
        <Button onClick={() => {
          setTurns(buildTurns(pack, lang, mode));
          setIndex(0); setSelected(null); setPhase('question'); setQueue([]); setCorrectCount(0); setTotalAnswered(0); setStreak(0); setBestStreak(0); setXpEarned(0); setInputValue('');
        }}>Reiniciar</Button>
      </Card>
    );
  }

  let feedbackEval = null;
  if(phase==='feedback') {
    if(current.mode === 'mcq') {
      feedbackEval = { ok: selected === current.correct, fuzzy: false };
    } else {
      feedbackEval = grade(selected);
    }
  }
  const isCorrect = feedbackEval?.ok;
  const isFuzzy = feedbackEval?.fuzzy;

  return (
    <Card title="Mini diálogos" subtitle={mode==='mcq' ? 'Comprensión (elige la traducción)' : 'Producción (escribe en el idioma)'}>
      <div className="flex gap-2 mb-4 flex-wrap">
        <label className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer border ${mode==='mcq' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600'}`}
          onClick={()=> mode!=='mcq' && setMode('mcq')}>Comprensión</label>
        <label className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer border ${mode==='produce' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600'}`}
          onClick={()=> mode!=='produce' && setMode('produce')}>Producción</label>
      </div>
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <span>Turno {index + 1} / {turns.length + (queue.length ? `+${queue.length}` : '')}</span>
  <span>{Math.round(progressRatio * 100)}% · Racha {streak} (máx {bestStreak})</span>
      </div>
      <div className="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700 mb-4 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(progressRatio * 100)}%` }} />
      </div>
      <div className="mb-4">
        {mode==='mcq' ? (
          <>
            <p className="font-semibold text-lg mb-1 select-none">{current.source}</p>
            <div className="flex gap-2 mb-2">
              <Button variant="ghost" onClick={() => speak(current.source, current.lang)}>Escuchar 🔊</Button>
              {current.retry && <span className="text-xs px-2 py-1 rounded bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200">Reintento</span>}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-1 opacity-70">Traduce al {current.lang.toUpperCase()}:</p>
            <p className="font-semibold text-lg mb-2 select-none">{current.native}</p>
            <div className="flex gap-2 mb-2">
              <Button variant="ghost" onClick={() => speak(current.target, current.lang)}>Escuchar 🔊</Button>
              {current.retry && <span className="text-xs px-2 py-1 rounded bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200">Reintento</span>}
            </div>
            {phase==='question' && (
              <input
                type="text"
                autoFocus
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm"
                placeholder="Escribe aquí..."
                value={inputValue}
                onChange={e=>setInputValue(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && inputValue.trim()) handleProduceSubmit(); }}
              />
            )}
          </>
        )}
      </div>
      {mode==='mcq' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {(Array.isArray(current.options) ? current.options : []).map(opt => {
            const chosen = selected === opt;
            const correct = opt === current.correct;
            const base = 'px-3 py-2 rounded-xl text-sm font-medium border transition-colors';
            let cls = 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600';
            if (phase === 'feedback') {
              if (correct) cls = 'bg-emerald-500 text-white border-emerald-600';
              else if (chosen && !correct) cls = 'bg-rose-500 text-white border-rose-600';
              else cls = 'bg-white/60 dark:bg-neutral-700/60 opacity-70';
            } else if (chosen) {
              cls = 'bg-emerald-100 dark:bg-emerald-600/30 border-emerald-400 dark:border-emerald-500';
            }
            return (
              <button key={opt} disabled={phase==='feedback'} onClick={() => handleSelect(opt)} className={`${base} ${cls}`}>
                {opt}
              </button>
            );
          })}
          {Array.isArray(current.options) && current.options.length === 0 && (
            <div className="text-xs opacity-60 col-span-2">Preparando opciones...</div>
          )}
        </div>
      )}
      {phase === 'feedback' && (
        <div className="mb-4 text-sm">
          {isCorrect ? (
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">{isFuzzy ? '≈ Casi correcto' : '✓ Correcto'}. <span className="font-normal">{mode==='mcq' ? `${current.source} = ${current.correct}` : `${current.native} = ${current.target}`}</span>{isFuzzy && <span className="ml-2 text-xs opacity-70">(fuzzy)</span>}</p>
          ) : (
            <p className="text-rose-600 dark:text-rose-400 font-medium">✕ Incorrecto. <span className="font-normal">{mode==='mcq' ? `${current.source} = ${current.correct}` : `${current.native} = ${current.target}`}</span></p>
          )}
          <p className="mt-1 text-xs opacity-70">XP total: {xpEarned}</p>
        </div>
      )}
      <div className="flex justify-end">
        {phase === 'feedback' ? (
          <Button onClick={goNext}>Siguiente</Button>
        ) : mode==='mcq' ? (
          <Button disabled={!selected} onClick={()=> setPhase('feedback')}>Comprobar</Button>
        ) : (
          <Button disabled={!inputValue.trim()} onClick={handleProduceSubmit}>Comprobar</Button>
        )}
      </div>
    </Card>
  );
}
