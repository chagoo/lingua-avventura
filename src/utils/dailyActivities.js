import { todayStr } from './date'

function seedRandom(seed){
  let h = 0
  for(let i=0;i<seed.length;i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  return function(){
    h = Math.imul(48271, h) % 0x7fffffff
    return (h & 0x7fffffff) / 0x7fffffff
  }
}

export function generateDailyActivities(activities, date = todayStr()){
  const rng = seedRandom(date)
  return [...activities].sort(()=>rng()-0.5)
}
