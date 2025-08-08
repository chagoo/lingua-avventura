import { useEffect, useState, useMemo } from 'react'
import { createDataService, defaultState } from '../services/dataService'
import { todayStr } from '../utils/date'

export { todayStr }

export function useProgress({ backend, dataService } = {}){
  const svc = useMemo(() => dataService || createDataService(backend), [backend, dataService])
  const [progress, setProgress] = useState(defaultState)

  // Sincroniza al montar (por si cambió la racha)
  useEffect(()=>{
    let alive = true
    svc.loadProgress().then(p=>{ if(alive) setProgress(p) })
    return ()=>{ alive=false }
  }, [svc])

  const awardXP = async (amount)=>{ const s = await svc.awardXP({...progress}, amount); setProgress({...s}) }
  const incrementCompletion = async (key, by=1)=>{ const s = await svc.incrementCompletion({...progress}, key, by); setProgress({...s}) }
  const markLearned = async (word)=>{ const s = await svc.markLearned({...progress}, word); setProgress({...s}) }
  const markError = async (word)=>{ const s = await svc.markError({...progress}, word); setProgress({...s}) }
  const setNarrationMode = async (mode)=>{ const s = await svc.setNarrationMode({...progress}, mode); setProgress({...s}) }
  const resetAll = async ()=>{ const s = await svc.resetAll(); setProgress(s) }

  return { progress, awardXP, incrementCompletion, markLearned, markError, setNarrationMode, resetAll }
}
