import { useEffect, useState } from 'react'
import { createDataService, defaultState } from '../services/dataService'

const svc = createDataService()

export function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function useProgress(){
  const [progress, setProgress] = useState(() => svc.loadProgress() || defaultState)

  // Sincroniza al montar (por si cambió la racha)
  useEffect(()=>{ setProgress(svc.loadProgress()) }, [])

  const awardXP = (amount)=> setProgress(prev=> ({...svc.awardXP({...prev}, amount)}))
  const incrementCompletion = (key, by=1)=> setProgress(prev=> ({...svc.incrementCompletion({...prev}, key, by)}))
  const markLearned = (word)=> setProgress(prev=> ({...svc.markLearned({...prev}, word)}))
  const setNarrationMode = (mode)=> setProgress(prev=> ({...svc.setNarrationMode({...prev}, mode)}))
  const resetAll = ()=> setProgress(svc.resetAll())

  return { progress, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll }
}
