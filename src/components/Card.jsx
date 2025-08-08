import React from 'react'

export default function Card({ title, subtitle, children, footer, onClick }){
  return (
    <div
      className={`rounded-2xl shadow-md bg-white/90 backdrop-blur border border-neutral-200 p-4 hover:shadow-lg transition ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}
    >
      {title && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="mt-3 text-sm text-neutral-600">{footer}</div>}
    </div>
  )
}
