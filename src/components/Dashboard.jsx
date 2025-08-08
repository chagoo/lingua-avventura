import React from 'react'
import Chip from './Chip'
import Card from './Card'

export default function Dashboard({ progress }){
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
