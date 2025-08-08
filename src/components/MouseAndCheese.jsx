import React, { useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import Chip from './Chip'
import { speak } from '../services/speech'

export default function MouseAndCheese({ pack, onEatCheese, lang }){
  const canvasRef = useRef(null)
  const [running, setRunning] = useState(true)
  const grid = 20
  const width = 28, height = 20
  const words = useMemo(()=> pack.map(w=>w[lang]), [pack, lang])
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
        speak(word, lang)
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
      <canvas ref={canvasRef} width={28*grid} height={20*grid} className="rounded-2xl border-4 border-amber-700 bg-emerald-100"/>
      <p className="text-sm text-neutral-600 mt-2">Consejo: repite en voz alta la palabra. 🎧</p>
    </Card>
  )
}
