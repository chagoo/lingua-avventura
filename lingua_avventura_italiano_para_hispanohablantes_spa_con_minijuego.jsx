# Lingua Avventura — Proyecto listo para GitHub Pages (Vite + React + Tailwind)

A continuación tienes **todos los archivos** para subir directo a GitHub (o GitHub Pages). Incluye un **`dataService`** con una **interfaz estable** para que mañana enchufemos **Firebase** sin tocar el resto de la app.

---

## 📁 Estructura
```
lingua-avventura/
├─ index.html
├─ package.json
├─ vite.config.js
├─ postcss.config.cjs
├─ tailwind.config.cjs
├─ README.md
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   ├─ index.css
   ├─ hooks/
   │  └─ useProgress.js
   └─ services/
      └─ dataService.js
```

---

## `package.json`
```json
{
  "name": "lingua-avventura",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.3",
    "vite": "^5.0.0"
  }
}
```

## `vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '' // <- si usas GitHub Pages con user/REPO, cambia a '/REPO/'
})
```

> Nota: si publicas en `https://usuario.github.io/REPO/`, cambia `base: '/REPO/'`.

## `postcss.config.cjs`
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## `tailwind.config.cjs`
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## `index.html`
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lingua Avventura</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## `src/main.jsx`
```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { @apply bg-amber-50 text-neutral-900; }
```

## `src/services/dataService.js`
```js
/**
 * Data Service con interfaz estable para progreso.
 * Hoy: implementación LocalStorage.
 * Mañana: podrás cambiar a Firebase implementando la MISMA interfaz.
 *
 * Interfaz esperada (métodos):
 * - loadProgress()
 * - saveProgress(state)
 * - awardXP(amount)
 * - incrementCompletion(key, by)
 * - markLearned(word)
 * - setNarrationMode(mode)  // 'it' | 'fr'
 * - resetAll()
 */

const LS_KEY = 'lingua_avventura_progress_v1';

function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export const defaultState = {
  createdAt: todayStr(),
  lastActive: todayStr(),
  streak: 1,
  xp: 0,
  wordsLearned: {},
  completions: {
    flashcards: 0,
    quiz: 0,
    matching: 0,
    review: 0,
    gameCheeseEaten: 0,
  },
  settings: { narrationMode: 'it' }
};

function daysBetween(a,b){
  const A = new Date(a+'T00:00:00');
  const B = new Date(b+'T00:00:00');
  return Math.round((B-A)/(1000*60*60*24));
}

/** LocalStorage backend */
function createLocalStorageBackend(){
  return {
    load(){
      try { const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw): null; } catch { return null; }
    },
    save(state){
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
    },
    clear(){
      try { localStorage.removeItem(LS_KEY); } catch {}
    }
  }
}

/** Firebase backend (stub) — implementa estos 3 métodos mañana */
function createFirebaseBackend(){
  return {
    load(){ throw new Error('TODO: implementar Firebase.load()'); },
    save(){ throw new Error('TODO: implementar Firebase.save()'); },
    clear(){ throw new Error('TODO: implementar Firebase.clear()'); },
  }
}

/** Selector de backend */
const backend = createLocalStorageBackend(); // <- cambia a createFirebaseBackend() cuando esté listo

export function createDataService(){
  return {
    loadProgress(){
      const state = backend.load() || defaultState;
      // Mantener racha al cargar (si es nuevo día)
      const today = todayStr();
      if (state.lastActive !== today){
        const diff = daysBetween(state.lastActive, today);
        state.streak = (diff === 1) ? (state.streak + 1) : 1;
        state.lastActive = today;
        backend.save(state);
      }
      return structuredClone(state);
    },
    saveProgress(state){ backend.save(state); },

    awardXP(state, amount){ state.xp += amount; state.lastActive = todayStr(); backend.save(state); return state; },

    incrementCompletion(state, key, by=1){
      state.completions[key] = (state.completions[key]||0) + by;
      state.lastActive = todayStr();
      backend.save(state); return state;
    },

    markLearned(state, word){
      state.wordsLearned[word] = (state.wordsLearned[word]||0) + 1;
      state.xp += 5; state.lastActive = todayStr(); backend.save(state); return state;
    },

    setNarrationMode(state, mode){ state.settings.narrationMode = mode; backend.save(state); return state; },

    resetAll(){ backend.clear(); backend.save(defaultState); return structuredClone(defaultState); },
  }
}
```

## `src/hooks/useProgress.js`
```js
import { useEffect, useState } from 'react'
import { createDataService, defaultState } from '../services/dataService'

const svc = createDataService()

export function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function useProgress(){
  const [progress, setProgress] = useState(() => svc.loadProgress() || defaultState)

  // Sincroniza al montar (por si cambió la racha)
  useEffect(()=>{ setProgress(svc.loadProgress()) }, [])

  const awardXP = (amount)=> setProgress(prev=> ({...svc.awardXP({...prev}, amount)}))
  const incrementCompletion = (key, by=1)=> setProgress(prev=> ({...svc.incrementCompletion({...prev}, key, by)}))
  const markLearned = (word)=> setProgress(prev=> ({...svc.markLearned({...prev}, word)}))
  const setNarrationMode = (mode)=> setProgress(prev=> ({...svc.setNarrationMode({...prev}, mode)}))
  const resetAll = ()=> setProgress(svc.resetAll())

  return { progress, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll }
}
```

## `src/App.jsx`
```jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from './hooks/useProgress'

/*********************** Utilidades ***********************/
function speak(text, lang = 'it-IT'){
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  utter.rate = 0.95
  utter.pitch = 1.0
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  const match = voices.find(v => v.lang?.toLowerCase().startsWith(lang.toLowerCase()))
  if (match) utter.voice = match
  synth.cancel()
  synth.speak(utter)
}

const PACK_IT_ES = [
  { it: 'ciao', es: 'hola' },
  { it: 'grazie', es: 'gracias' },
  { it: 'per favore', es: 'por favor' },
  { it: 'prego', es: 'de nada' },
  { it: 'acqua', es: 'agua' },
  { it: 'pane', es: 'pan' },
  { it: 'formaggio', es: 'queso' },
  { it: 'latte', es: 'leche' },
  { it: 'ciao, come stai?', es: 'hola, ¿cómo estás?' },
  { it: 'mi chiamo...', es: 'me llamo...' },
]
const PACK_FR_ES = [
  { fr: 'bonjour', es: 'hola' },
  { fr: 'merci', es: 'gracias' },
  { fr: "s'il vous plaît", es: 'por favor' },
  { fr: 'de rien', es: 'de nada' },
  { fr: 'eau', es: 'agua' },
  { fr: 'pain', es: 'pan' },
  { fr: 'fromage', es: 'queso' },
  { fr: 'lait', es: 'leche' },
  { fr: 'comment ça va?', es: '¿cómo estás?' },
  { fr: "je m'appelle...", es: 'me llamo...' },
]

/*********************** UI base ***********************/
function Chip({ children }){
  return <span className="inline-block rounded-2xl px-3 py-1 text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">{children}</span>
}
function Card({ title, subtitle, children, footer, onClick }){
  return (
    <div className={`rounded-2xl shadow-md bg-white/90 backdrop-blur border border-neutral-200 p-4 hover:shadow-lg transition cursor-${onClick? 'pointer':'default'}`} onClick={onClick}>
      {title && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="mt-3 text-sm text-neutral-600">{footer}</div>}
    </div>
  )
}
function Tabs({ tabs, value, onChange }){
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(t => (
        <button key={t.value} className={`px-4 py-2 rounded-2xl border ${value===t.value? 'bg-emerald-600 text-white border-emerald-600':'bg-white hover:bg-neutral-50 border-neutral-200'} transition`} onClick={()=>onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  )
}

/*********************** Dashboard ***********************/
function Dashboard({ progress }){
  const totalWords = Object.keys(progress.wordsLearned).length
  const level = Math.floor(progress.xp / 100) + 1
  const xpInLevel = progress.xp % 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Racha" subtitle="Días seguidos estudiando">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🔥</div>
          <div>
            <div className="text-3xl font-bold">{progress.streak}</div>
            <div className="text-sm text-neutral-600">¡Sigue así!</div>
          </div>
        </div>
      </Card>
      <Card title="Nivel" subtitle="Gana XP para subir de nivel">
        <div>
          <div className="text-3xl font-bold mb-2">{level}</div>
          <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${xpInLevel}%` }} />
          </div>
          <div className="text-sm mt-1 text-neutral-600">{xpInLevel} / 100 XP</div>
        </div>
      </Card>
      <Card title="Palabras" subtitle="Aprendidas (aprox.)">
        <div className="text-3xl font-bold">{totalWords}</div>
        <div className="text-sm text-neutral-600">Sigue practicando para consolidar.</div>
      </Card>
      <Card title="Actividad" subtitle="Resumen rápido" footer={
        <div className="flex flex-wrap gap-2">
          <Chip>Flashcards: {progress.completions.flashcards}</Chip>
          <Chip>Quiz: {progress.completions.quiz}</Chip>
          <Chip>Memoria: {progress.completions.matching}</Chip>
          <Chip>Revisión: {progress.completions.review}</Chip>
          <Chip>Quesos (juego): {progress.completions.gameCheeseEaten}</Chip>
        </div>
      }>
        <p className="text-neutral-700">¡Vamos por más! 🍝</p>
      </Card>
    </div>
  )
}

/*********************** Flashcards ***********************/
function Flashcards({ pack, onComplete, onLearned, lang }){
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const current = pack[idx]
  const frontText = lang==='it' ? current.it : current.fr

  const onSpeak = ()=>{ speak(frontText, lang==='it'?'it-IT':'fr-FR'); onLearned(frontText) }
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

/*********************** Quiz ***********************/
function Quiz({ pack, onComplete, onLearned, lang, awardXP }){
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
      return { prompt: (lang==='it'? item.it:item.fr), correct, options: Array.from(options).sort(()=>Math.random()-0.5) }
    })
  }, [pack, lang])

  const q = questions[qIdx]
  const select = (opt)=>{ setSelected(opt); if(opt===q.correct){ setScore(s=>s+1); awardXP(10); onLearned(q.prompt) } }
  const next = ()=>{ if(qIdx<questions.length-1){ setQIdx(qIdx+1); setSelected(null) } else { onComplete(score) } }

  return (
    <Card title={`Pregunta ${qIdx+1} / ${questions.length}`} subtitle={lang==='it'? 'Traduce del italiano al español':'Traduce del francés al español'}>
      <div className="mb-3 text-2xl font-semibold">{q.prompt}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {q.options.map(opt=> (
          <button key={opt} className={`px-4 py-3 rounded-xl border text-left ${selected===opt ? (opt===q.correct? 'bg-emerald-100 border-emerald-400':'bg-rose-100 border-rose-400'): 'bg-white border-neutral-200 hover:bg-neutral-50'}`} onClick={()=>select(opt)}>{opt}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>speak(q.prompt, lang==='it'?'it-IT':'fr-FR')}>Escuchar</button>
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={next}>Continuar</button>
      </div>
    </Card>
  )
}

/*********************** Matching ***********************/
function Matching({ pack, onComplete, onLearned, lang }){
  const items = useMemo(()=>{
    const slice=[...pack].sort(()=>Math.random()-0.5).slice(0,6)
    const words=slice.map(w=>({ id:`w-${w.it||w.fr}`, type:'word', text: (lang==='it'?w.it:w.fr), pair:w.es }))
    const defs=slice.map(w=>({ id:`d-${w.es}`, type:'def', text:w.es, pair:(lang==='it'?w.it:w.fr) }))
    return [...words,...defs].sort(()=>Math.random()-0.5)
  }, [pack, lang])

  const [selected, setSelected]=useState(null)
  const [removed, setRemoved]=useState([])

  const click=(item)=>{
    if(removed.includes(item.id)) return
    if(!selected){ setSelected(item); return }
    if(selected && selected.type!==item.type && selected.pair===item.text){
      setRemoved(prev=>[...prev, selected.id, item.id])
      onLearned(selected.text)
      setSelected(null)
      if(removed.length + 2 >= items.length) onComplete()
    } else { setSelected(item) }
  }

  return (
    <Card title="Memoria" subtitle="Empareja palabra y significado">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map(it=> (
          <button key={it.id} className={`px-3 py-3 rounded-xl border text-left ${removed.includes(it.id)? 'opacity-30 pointer-events-none':'hover:bg-neutral-50'} ${selected?.id===it.id? 'border-emerald-400 bg-emerald-50':'border-neutral-200 bg-white'}`} onClick={()=>click(it)}>{it.text}</button>
        ))}
      </div>
    </Card>
  )
}

/*********************** Revisión diaria ***********************/
function DailyReview({ pack, onComplete, lang, awardXP }){
  const [qIdx, setQIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)

  const questions = useMemo(()=>{
    const base=[...pack].sort(()=>Math.random()-0.5).slice(0,5)
    return base.map(item=>({ prompt: (lang==='it'? item.it:item.fr), correct: item.es }))
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
      <button className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>speak(q.prompt, lang==='it'?'it-IT':'fr-FR')}>Escuchar</button>
    </Card>
  )
}

/*********************** Juego: Topo & Formaggio ***********************/
function MouseAndCheese({ pack, onEatCheese, lang }){
  const canvasRef = useRef(null)
  const [running, setRunning] = useState(true)
  const grid = 20
  const width = 28, height = 20
  const words = useMemo(()=> (lang==='it'? pack.map(w=>w.it): pack.map(w=>w.fr)), [pack, lang])
  const wordIndexRef = useRef(0)
  const mouseRef = useRef([{x:5,y:5}])
  const dirRef = useRef({x:1,y:0})
  const cheeseRef = useRef({x:10,y:8})
  const lastTickRef = useRef(0)
  const speedRef = useRef(140)

  useEffect(()=>{
    const onKey = (e)=>{
      if(e.key==='ArrowUp' && dirRef.current.y!==1) dirRef.current={x:0,y:-1}
      if(e.key==='ArrowDown' && dirRef.current.y!==-1) dirRef.current={x:0,y:1}
      if(e.key==='ArrowLeft' && dirRef.current.x!==1) dirRef.current={x:-1,y:0}
      if(e.key==='ArrowRight' && dirRef.current.x!==-1) dirRef.current={x:1,y:0}
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(()=>{
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function spawnCheese(){ cheeseRef.current = { x: Math.floor(Math.random()*width), y: Math.floor(Math.random()*height) } }

    function tick(ts){
      if(!running) return
      if(ts - lastTickRef.current < speedRef.current){ requestAnimationFrame(tick); return }
      lastTickRef.current = ts

      const snake = mouseRef.current
      const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y }

      if(head.x<0 || head.x>=width || head.y<0 || head.y>=height){ setRunning(false); return }
      if(snake.some(seg=> seg.x===head.x && seg.y===head.y)){ setRunning(false); return }

      snake.unshift(head)

      if(head.x===cheeseRef.current.x && head.y===cheeseRef.current.y){
        const word = words[wordIndexRef.current % words.length]
        speak(word, lang==='it'? 'it-IT':'fr-FR')
        onEatCheese(word)
        wordIndexRef.current++
        speedRef.current = Math.max(70, speedRef.current - 3)
        spawnCheese()
      } else { snake.pop() }

      ctx.fillStyle = '#f4fde3'
      ctx.fillRect(0,0, width*grid, height*grid)

      ctx.fillStyle = '#ffd447'
      const q = cheeseRef.current
      ctx.beginPath()
      ctx.arc(q.x*grid + grid/2, q.y*grid + grid/2, grid/2.6, 0, Math.PI*2)
      ctx.fill()

      ctx.fillStyle = '#7c7c7c'
      snake.forEach(s=> ctx.fillRect(s.x*grid, s.y*grid, grid, grid))
      const h = snake[0]
      ctx.fillStyle = '#5f5f5f'
      ctx.fillRect(h.x*grid, h.y*grid, grid, grid)
      ctx.beginPath();
      ctx.arc(h.x*grid + grid*0.3, h.y*grid + grid*0.2, 3, 0, Math.PI*2)
      ctx.arc(h.x*grid + grid*0.7, h.y*grid + grid*0.2, 3, 0, Math.PI*2)
      ctx.fill()

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [running, lang, pack, onEatCheese, words])

  return (
    <Card title="Topo & Formaggio" subtitle="Usa las flechas. Come queso para oír nuevas palabras.">
      <div className="flex items-center gap-2 mb-2">
        <Chip>{running? 'En juego':'Game Over'}</Chip>
        <button className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={()=>setRunning(r=>!r)}>{running? 'Pausar':'Reiniciar'}</button>
      </div>
      <canvas ref={canvasRef} width={28*grid} height={20*grid} className="rounded-2xl border-4 border-amber-700 bg-emerald-100" />
      <p className="text-sm text-neutral-600 mt-2">Consejo: repite en voz alta la palabra. 🎧</p>
    </Card>
  )
}

/*********************** App ***********************/
export default function App(){
  const { progress, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll } = useProgress()
  const [tab, setTab] = useState('dashboard')
  const lang = progress.settings.narrationMode
  const pack = lang==='it' ? PACK_IT_ES : PACK_FR_ES

  const onFlashcardsComplete = ()=>{ incrementCompletion('flashcards'); awardXP(20); alert('¡Flashcards listas!') }
  const onQuizComplete = (score)=>{ incrementCompletion('quiz'); awardXP(10*score); alert(`Quiz terminado. Puntuación: ${score}`) }
  const onMatchingComplete = ()=>{ incrementCompletion('matching'); awardXP(30); alert('¡Bien! Memoria completada.') }
  const onReviewComplete = (score)=>{ incrementCompletion('review'); awardXP(12*score); alert(`Revisión completa. Puntos: ${score}`) }
  const onEatCheese = (word)=>{ incrementCompletion('gameCheeseEaten'); markLearned(word) }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-emerald-50 text-neutral-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-neutral-200">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍝</span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Lingua Avventura</h1>
            <Chip>Italiano para hispanohablantes</Chip>
          </div>
          <div className="flex items-center gap-2">
            <select className="px-3 py-2 rounded-xl border border-neutral-300 bg-white" value={lang} onChange={e=>setNarrationMode(e.target.value)}>
              <option value="it">Narración: Italiano</option>
              <option value="fr">Narración: Francés</option>
            </select>
            <button className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={resetAll}>Reiniciar progreso</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Tabs tabs={[
          { value: 'dashboard', label: 'Inicio' },
          { value: 'flash', label: 'Flashcards' },
          { value: 'quiz', label: 'Quiz' },
          { value: 'match', label: 'Memoria' },
          { value: 'review', label: 'Revisión' },
          { value: 'game', label: 'Juego 🧀' },
        ]} value={tab} onChange={setTab} />

        {tab==='dashboard' && <Dashboard progress={progress} />}
        {tab==='flash' && <Flashcards pack={pack} lang={lang} onComplete={onFlashcardsComplete} onLearned={markLearned} />}
        {tab==='quiz' && <Quiz pack={pack} lang={lang} onComplete={onQuizComplete} onLearned={markLearned} awardXP={awardXP} />}
        {tab==='match' && <Matching pack={pack} lang={lang} onComplete={onMatchingComplete} onLearned={markLearned} />}
        {tab==='review' && <DailyReview pack={pack} lang={lang} onComplete={onReviewComplete} awardXP={awardXP} />}
        {tab==='game' && <MouseAndCheese pack={pack} lang={lang} onEatCheese={onEatCheese} />}

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Consejo del día" subtitle="Hábitos que funcionan">
            <ul className="list-disc ml-5 text-sm text-neutral-700 space-y-1">
              <li>Estudia 10–15 min diarios para mantener la racha.</li>
              <li>Repite en voz alta y grábate para comparar.</li>
              <li>Varía actividades: tarjetas, quiz, juego.</li>
            </ul>
          </Card>
          <Card title="Meta diaria" subtitle="Objetivo sugerido">
            <p className="text-sm">Aprender 5 palabras nuevas y jugar 1 partida de Topo & Formaggio.</p>
          </Card>
          <Card title="Acerca del paquete" subtitle="Personalizable">
            <p className="text-sm">Amplía vocabulario editando <code>PACK_IT_ES</code> o <code>PACK_FR_ES</code>. La narración usa SpeechSynthesis (voz del sistema).</p>
          </Card>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-neutral-500">Hecho con ❤️ para aprender Italiano — y con opción de narración en Francés.</footer>
    </div>
  )
}
```

## `README.md`
```md
# Lingua Avventura

SPA gamificada para aprender italiano (UI en español) con minijuego tipo Snake (ratón y queso) que narra palabras nuevas al comer.

## Desarrollo local
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## GitHub Pages
1. Crea el repo `lingua-avventura`.
2. Empuja el proyecto.
3. En `vite.config.js` ajusta `base: '/lingua-avventura/'`.
4. `npm run build` y publica el contenido de `dist/` en la rama `gh-pages` (o usa GitHub Action).
```
