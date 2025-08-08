import { useEffect, useState, useMemo } from 'react'
import { createDataService, defaultState } from '../services/dataService'
import { todayStr } from '../utils/date'

export { todayStr }

export function useProgress({ backend, dataService } = {}){
  const svc = useMemo(() => dataService || createDataService(backend), [backend, dataService])
  const [progress, setProgress] = useState(() => svc.loadProgress() || defaultState)

  // Sincroniza al montar (por si cambió la racha)
  useEffect(()=>{ setProgress(svc.loadProgress()) }, [svc])

  const awardXP = (amount)=> setProgress(prev=> ({...svc.awardXP({...prev}, amount)}))
  const incrementCompletion = (key, by=1)=> setProgress(prev=> ({...svc.incrementCompletion({...prev}, key, by)}))
  const markLearned = (word)=> setProgress(prev=> ({...svc.markLearned({...prev}, word)}))
  const setNarrationMode = (mode)=> setProgress(prev=> ({...svc.setNarrationMode({...prev}, mode)}))
  const resetAll = ()=> setProgress(svc.resetAll())

  return { progress, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll }
}
