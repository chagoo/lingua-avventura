/**
 * Data Service con interfaz estable para progreso.
 * Hoy: implementación LocalStorage.
 * Mañana: podrás cambiar a Firebase implementando la MISMA interfaz.
 *
 * Interfaz esperada (métodos):
 * - loadProgress()
 * - saveProgress(state)
 * - awardXP(amount)
 * - incrementCompletion(key, by)
 * - markLearned(word)
 * - setNarrationMode(mode)  // 'it' | 'fr' | 'en'
 * - resetAll()
 */

import { todayStr } from '../utils/date'
import { db } from './firebaseClient'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const LS_KEY = 'lingua_avventura_progress_v1';

export const defaultState = {
  createdAt: todayStr(),
  lastActive: todayStr(),
  streak: 1,
  xp: 0,
  todayXP: 0,
  dailyGoal: 50,
  wordsLearned: {},
  errors: {},
  completions: {
    flashcards: 0,
    quiz: 0,
    matching: 0,
    review: 0,
    gameCheeseEaten: 0,
    dialogues: 0,
  },
  settings: { narrationMode: 'it' }
};

function daysBetween(a,b){
  const A = new Date(a+'T00:00:00');
  const B = new Date(b+'T00:00:00');
  return Math.round((B-A)/(1000*60*60*24));
}

/** LocalStorage backend */
export function createLocalStorageBackend(){
  return {
    async load(){
      try { const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw): null; } catch { return null; }
    },
    async save(state){
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
    },
    async clear(){
      try { localStorage.removeItem(LS_KEY); } catch {}
    }
  }
}

/** Firebase backend utilizando Firestore */
export function createFirebaseBackend(userId='default'){
  const docRef = doc(db, 'progress', userId)
  return {
    async load(){
      const snap = await getDoc(docRef)
      return snap.exists() ? snap.data() : null
    },
    async save(state){ await setDoc(docRef, state) },
    async clear(){ await deleteDoc(docRef) },
  }
}

export function createDataService(backend = createLocalStorageBackend()){
  return {
    async loadProgress(){
      const state = await backend.load() || defaultState
      // Mantener racha al cargar (si es nuevo día)
      const today = todayStr()
      if (state.lastActive !== today){
        const diff = daysBetween(state.lastActive, today)
        state.streak = (diff === 1) ? (state.streak + 1) : 1
        state.lastActive = today
        state.todayXP = 0
        await backend.save(state)
      }
      return structuredClone(state)
    },
    async saveProgress(state){ await backend.save(state) },

    async awardXP(state, amount){ state.xp += amount; state.todayXP += amount; state.lastActive = todayStr(); await backend.save(state); return state; },

    async incrementCompletion(state, key, by=1){
      state.completions[key] = (state.completions[key]||0) + by
      state.lastActive = todayStr()
      await backend.save(state); return state
    },

    async markLearned(state, word){
      state.wordsLearned[word] = (state.wordsLearned[word]||0) + 1
      state.xp += 5; state.todayXP +=5; state.lastActive = todayStr(); await backend.save(state); return state
    },

    async markError(state, word){
      state.errors[word] = (state.errors[word]||0) + 1
      state.lastActive = todayStr(); await backend.save(state); return state
    },

    async setNarrationMode(state, mode){ state.settings.narrationMode = mode; await backend.save(state); return state },

    async resetAll(){ await backend.clear(); await backend.save(defaultState); return structuredClone(defaultState) },
  }
}
