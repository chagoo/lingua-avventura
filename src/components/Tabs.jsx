import React from 'react'

export default function Tabs({ tabs, value, onChange }){
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(t => (
        <button
          key={t.value}
          className={`px-4 py-2 rounded-2xl border ${value===t.value ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-700 dark:border-emerald-700' : 'bg-white hover:bg-neutral-50 border-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:border-neutral-600 dark:text-neutral-100'} transition`}
          onClick={()=>onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
