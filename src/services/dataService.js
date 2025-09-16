// src/services/dataService.js
import {
  getProgressTableName,
  isSupabaseConfigured,
  requireAuthUser,
  loadUserState,
  saveUserState,
  deleteUserState,
} from "./supabase";

const configuredBackend = (import.meta.env?.VITE_BACKEND || "").toLowerCase();
const BACKEND = configuredBackend || (isSupabaseConfigured() ? "supabase" : "local");
const LS_KEY  = "lingua_avventura_progress_v2";

function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export const defaultState = {
  createdAt: todayStr(),
  lastActive: todayStr(),
  streak: 1,
  xp: 0,
  wordsLearned: {},
  reviews: {},
  settings: { narrationMode: "it" },
  completions: {
    flashcards: 0,
    quiz: 0,
    matching: 0,
    review: 0,
    dialogues: 0,
    gameCheeseEaten: 0,
  },
};

function createLocalBackend(){
  return {
    async load(){ const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; },
    async save(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); },
    async clear(){ localStorage.removeItem(LS_KEY); },
    async user(){ return { id: "local-user" }; },
  };
}

async function createSupabaseBackend() {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_CONFIG_MISSING");
  }

  const user = await requireAuthUser();
  const table = getProgressTableName();

  async function load() {
    return await loadUserState(table, user.id);
  }

  async function save(state) {
    await saveUserState(table, user.id, state);
  }

  async function clear() {
    await deleteUserState(table, user.id);
  }

  return { load, save, clear, user: async () => user };
}

async function backendFactory(){
  if (BACKEND === "supabase") return await createSupabaseBackend();
  return createLocalBackend();
}

export async function createDataService(){
  const be = await backendFactory();

  function daysBetween(a,b){
    const A = new Date(a+"T00:00:00"), B = new Date(b+"T00:00:00");
    return Math.round((B-A)/86400000);
  }

  function applyMigrations(state){
    const base = structuredClone(state);
    // Asegurar settings
    base.settings = {
      ...defaultState.settings,
      ...(base.settings || {})
    };
    // Asegurar completions
    base.completions = {
      ...defaultState.completions,
      ...(base.completions || {})
    };
    // Asegurar campos básicos
    if (!base.createdAt) base.createdAt = todayStr();
    if (!base.lastActive) base.lastActive = todayStr();
    if (typeof base.streak !== 'number') base.streak = 1;
    if (typeof base.xp !== 'number') base.xp = 0;
    if (!base.wordsLearned) base.wordsLearned = {};
    if (!base.reviews) base.reviews = {};
    return base;
  }

  async function loadProgress(){
    const saved = await be.load();
    let base  = saved ? applyMigrations(saved) : structuredClone(defaultState);
    const today = todayStr();
    if (base.lastActive !== today){
      const diff = daysBetween(base.lastActive, today);
      base.streak = (diff === 1) ? base.streak + 1 : 1;
      base.lastActive = today;
      await be.save(base);
    }
    return structuredClone(base);
  }

  async function saveProgress(state){ await be.save(state); }

  return {
    async loadProgress(){ return await loadProgress(); },
    async saveProgress(s){ return await saveProgress(s); },

    async awardXP(s, amount){
      s.xp += amount;
      s.lastActive = todayStr();
      await be.save(s);
      return s;
    },
    async incrementCompletion(s, key, by=1){
      s.completions[key] = (s.completions[key]||0) + by;
      s.lastActive = todayStr();
      await be.save(s);
      return s;
    },
    async markLearned(s, wordId){
      s.wordsLearned[wordId] = (s.wordsLearned[wordId]||0) + 1;
      s.lastActive = todayStr();
      await be.save(s);
      return s;
    },
    async setNarrationMode(s, mode){
      s.settings.narrationMode = mode;
      await be.save(s);
      return s;
    },
    async resetAll(){
      const fresh = structuredClone(defaultState);
      await be.save(fresh);
      return fresh;
    },
  };
}
