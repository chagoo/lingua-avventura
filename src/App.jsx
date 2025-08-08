import React, { useState } from 'react'
import { useProgress } from './hooks/useProgress'
import Chip from './components/Chip'
import Card from './components/Card'
import Tabs from './components/Tabs'
import Dashboard from './components/Dashboard'
import Flashcards from './components/Flashcards'
import Quiz from './components/Quiz'
import Matching from './components/Matching'
import DailyReview from './components/DailyReview'
import MouseAndCheese from './components/MouseAndCheese'
import { getPack } from './data/packs'

export default function App(){
  const { progress, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll } = useProgress()
  const [tab, setTab] = useState('dashboard')
  const lang = progress.settings.narrationMode
  const pack = getPack(lang)

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
            <Chip>Idiomas para hispanohablantes</Chip>
          </div>
          <div className="flex items-center gap-2">
            <select className="px-3 py-2 rounded-xl border border-neutral-300 bg-white" value={lang} onChange={e=>setNarrationMode(e.target.value)}>
              <option value="it">Narración: Italiano</option>
              <option value="fr">Narración: Francés</option>
              <option value="en">Narración: Inglés</option>
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
            <p className="text-sm">Amplía vocabulario editando los paquetes en <code>src/data/packs.js</code>. La narración usa SpeechSynthesis (voz del sistema).</p>
          </Card>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-neutral-500">Hecho con ❤️ para aprender idiomas — narración disponible en Italiano, Francés e Inglés.</footer>
    </div>
  )
}
