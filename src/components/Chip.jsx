import React from 'react'

export default function Chip({ children }){
  return <span className="inline-block rounded-2xl px-3 py-1 text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700">{children}</span>
}
