import { useEffect, useState, useCallback, useRef } from "react";
import { createDataService, defaultState } from "../services/dataService";

export function useProgress() {
  const [progress, setProgress] = useState(null);
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dirtyRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Configuración debounce (5s por defecto)
  const DEBOUNCE_MS = 5000;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await createDataService();
        if (!alive) return;
        setSvc(s);
        const p = await s.loadProgress();
        if (!alive) return;
        setProgress(p);
      } catch (e) {
        if (alive) {
          console.warn("[useProgress] init error:", e);
          setError(e);
          setProgress(defaultState); // fallback local
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function withSvc(fn) {
    if (!svc) return;
    const next = await fn(svc);
    if (next) setProgress(structuredClone(next));
  }

  const scheduleDebouncedSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      if (!dirtyRef.current) return; // nada que guardar
      if (!svc || !svc.saveProgress) { // reintentar en siguiente ciclo si no hay servicio
        scheduleDebouncedSave();
        return;
      }
      try {
        await svc.saveProgress(structuredClone(progress));
        dirtyRef.current = false;
      } catch (e) {
        console.warn('[useProgress] debounced save error', e);
        // Reintentar con un nuevo debounce simple (sin backoff todavía)
        scheduleDebouncedSave();
      }
    }, DEBOUNCE_MS);
  }, [progress, svc]);

  // Mutación genérica in-place con persistencia diferida
  const updateProgress = useCallback((mutator) => {
    setProgress(prev => {
      const base = prev ? structuredClone(prev) : structuredClone(defaultState);
      try { mutator(base); } catch (e) { console.warn('[useProgress] updateProgress mutator error', e); }
      dirtyRef.current = true;
      scheduleDebouncedSave();
      return base;
    });
  }, [scheduleDebouncedSave]);

  // Exponer función para forzar flush inmediato (usado al finalizar actividades)
  const flushProgress = useCallback(async (immediate) => {
    if (!dirtyRef.current) return;
    if (!svc || !svc.saveProgress) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    try {
      await svc.saveProgress(structuredClone(progress));
      dirtyRef.current = false;
    } catch (e) {
      console.warn('[useProgress] flushProgress error', e);
      if (!immediate) scheduleDebouncedSave();
    }
  }, [progress, svc, scheduleDebouncedSave]);

  const api = {
    awardXP: (amount) => withSvc(async s => await s.awardXP(structuredClone(progress), amount)),
    incrementCompletion: (key, by = 1) => withSvc(async s => await s.incrementCompletion(structuredClone(progress), key, by)),
    markLearned: (wordId) => withSvc(async s => await s.markLearned(structuredClone(progress), wordId)),
    setNarrationMode: (mode) => withSvc(async s => await s.setNarrationMode(structuredClone(progress), mode)),
    setThemeMode: (theme) => withSvc(async s => await s.setThemeMode(structuredClone(progress), theme)),
    resetAll: () => withSvc(async s => await s.resetAll()),
    resetPackProgress: (lang, packWords) => withSvc(async s => await s.resetPackProgress(structuredClone(progress), lang, packWords)),
    updateProgress,
    flushProgress,
  };

  // Adjuntamos helpers en el propio objeto progress (copia proxy) para acceso directo.
  const enrichedProgress = progress ? { ...progress, resetPackProgress: api.resetPackProgress, setThemeMode: api.setThemeMode } : progress;

  return { progress: enrichedProgress, loading, error, ...api };
}
