import React from 'react'

export default function Tabs({ tabs, value, onChange }){
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(t => (
        <button key={t.value} className={`px-4 py-2 rounded-2xl border ${value===t.value? 'bg-emerald-600 text-white border-emerald-600':'bg-white hover:bg-neutral-50 border-neutral-200'} transition`} onClick={()=>onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  )
}
