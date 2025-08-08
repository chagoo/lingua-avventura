import React from 'react'

const VARIANTS = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  outline: 'bg-white border border-neutral-200 hover:bg-neutral-50'
}

export default function Button({ variant = 'primary', className = '', ...props }){
  const base = 'px-4 py-2 rounded-xl transition'
  const variantClasses = VARIANTS[variant] || ''
  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props} />
  )
}
