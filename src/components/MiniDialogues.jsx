import React, { useMemo, useState } from 'react'
import Card from './Card'
import Button from './Button'
import { speak } from '../utils/speech'

export default function MiniDialogues({ pack, lang, onComplete, awardXP }){
  const dialogues = useMemo(()=>{
    const shuffled=[...pack].sort(()=>Math.random()-0.5)
    const pairs=[]
    for(let i=0;i<shuffled.length-1;i+=2){ pairs.push([shuffled[i], shuffled[i+1]]) }
    return pairs.slice(0,3)
  }, [pack])
  const [idx, setIdx] = useState(0)
  const pair = dialogues[idx]
  const next = ()=>{ if(idx<dialogues.length-1){ setIdx(idx+1); awardXP(5) } else { awardXP(5); onComplete() } }
  return (
    <Card title="Mini diálogos" subtitle="Contexto conversacional">
      <div className="space-y-2 mb-3">
        <div onClick={()=>speak(pair[0][lang], lang)} className="cursor-pointer font-semibold">{pair[0][lang]} - {pair[0].es}</div>
        <div onClick={()=>speak(pair[1][lang], lang)} className="cursor-pointer font-semibold">{pair[1][lang]} - {pair[1].es}</div>
      </div>
      <Button onClick={next}>Siguiente</Button>
    </Card>
  )
}
