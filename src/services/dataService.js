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

const LS_KEY = 'lingua_avventura_progress_v1';

export const defaultState = {
  createdAt: todayStr(),
  lastActive: todayStr(),
  streak: 1,
  xp: 0,
  wordsLearned: {},
  completions: {
    flashcards: 0,
    quiz: 0,
    matching: 0,
    review: 0,
    gameCheeseEaten: 0,
  },
  settings: { narrationMode: 'it' }
};

function daysBetween(a,b){
  const A = new Date(a+'T00:00:00');
  const B = new Date(b+'T00:00:00');
  return Math.round((B-A)/(1000*60*60*24));
}

/** LocalStorage backend */
function createLocalStorageBackend(){
  return {
    load(){
      try { const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw): null; } catch { return null; }
    },
    save(state){
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
    },
    clear(){
      try { localStorage.removeItem(LS_KEY); } catch {}
    }
  }
}

/** Firebase backend (stub) — implementa estos 3 métodos mañana */
function createFirebaseBackend(){
  return {
    load(){ throw new Error('TODO: implementar Firebase.load()'); },
    save(){ throw new Error('TODO: implementar Firebase.save()'); },
    clear(){ throw new Error('TODO: implementar Firebase.clear()'); },
  }
}

/** Selector de backend */
const backend = createLocalStorageBackend(); // <- cambia a createFirebaseBackend() cuando esté listo

export function createDataService(){
  return {
    loadProgress(){
      const state = backend.load() || defaultState;
      // Mantener racha al cargar (si es nuevo día)
      const today = todayStr();
      if (state.lastActive !== today){
        const diff = daysBetween(state.lastActive, today);
        state.streak = (diff === 1) ? (state.streak + 1) : 1;
        state.lastActive = today;
        backend.save(state);
      }
      return structuredClone(state);
    },
    saveProgress(state){ backend.save(state); },

    awardXP(state, amount){ state.xp += amount; state.lastActive = todayStr(); backend.save(state); return state; },

    incrementCompletion(state, key, by=1){
      state.completions[key] = (state.completions[key]||0) + by;
      state.lastActive = todayStr();
      backend.save(state); return state;
    },

    markLearned(state, word){
      state.wordsLearned[word] = (state.wordsLearned[word]||0) + 1;
      state.xp += 5; state.lastActive = todayStr(); backend.save(state); return state;
    },

    setNarrationMode(state, mode){ state.settings.narrationMode = mode; backend.save(state); return state; },

    resetAll(){ backend.clear(); backend.save(defaultState); return structuredClone(defaultState); },
  }
}
