import React, { useMemo, useState } from 'react'
import Card from './Card'

export default function Matching({ pack, onComplete, onLearned, lang }){
  const items = useMemo(()=>{
    const slice=[...pack].sort(()=>Math.random()-0.5).slice(0,6)
    const words=slice.map(w=>({ id:`w-${w.it||w.fr||w.en}`, type:'word', text: w[lang], pair:w.es }))
    const defs=slice.map(w=>({ id:`d-${w.es}`, type:'def', text:w.es, pair:w[lang] }))
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
          <button key={it.id} className={`px-3 py-3 rounded-xl border text-left ${removed.includes(it.id)? 'opacity-30 pointer-events-none':'hover:bg-neutral-50 dark:hover:bg-neutral-700'} ${selected?.id===it.id? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900':'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'}`} onClick={()=>click(it)}>{it.text}</button>
        ))}
      </div>
    </Card>
  )
}
