import React from 'react'

export default function Tabs({ tabs, value, onChange }) {
  const tabRefs = React.useRef([])
  const [underlineStyle, setUnderlineStyle] = React.useState({ left: 0, width: 0 })

  const activeIndex = tabs.findIndex(t => t.value === value)

  React.useEffect(() => {
    const el = tabRefs.current[activeIndex]
    if (el) {
      setUnderlineStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeIndex, tabs])

  return (
    <div className="relative flex gap-2 mb-4">
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={el => (tabRefs.current[i] = el)}
          className={`relative px-4 py-2 rounded-2xl border ${
            value === t.value
              ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-700 dark:border-emerald-700'
              : 'bg-white hover:bg-neutral-50 border-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:border-neutral-600 dark:text-neutral-100'
          } transition`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
      <span
        className="absolute bottom-0 h-0.5 bg-emerald-600 transition-all duration-300"
        style={{ left: underlineStyle.left, width: underlineStyle.width }}
      />
    </div>
  )
}
