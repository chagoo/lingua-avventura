import React from 'react'

const VARIANTS = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600',
  outline: 'bg-white border border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-700 dark:border-neutral-600 dark:hover:bg-neutral-600 dark:text-neutral-100'
}

export default function Button({ variant = 'primary', className = '', ...props }){
  const base = 'px-4 py-2 rounded-xl transition'
  const variantClasses = VARIANTS[variant] || ''
  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props} />
  )
}
