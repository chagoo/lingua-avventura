import { useEffect, useState } from "react";
import { createDataService, defaultState } from "../services/dataService";

export function useProgress() {
  const [progress, setProgress] = useState(null);
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return {
    progress,
    loading,
    error,
    awardXP: (amount) =>
      withSvc(async s => await s.awardXP(structuredClone(progress), amount)),
    incrementCompletion: (key, by = 1) =>
      withSvc(async s => await s.incrementCompletion(structuredClone(progress), key, by)),
    markLearned: (wordId) =>
      withSvc(async s => await s.markLearned(structuredClone(progress), wordId)),
    setNarrationMode: (mode) =>
      withSvc(async s => await s.setNarrationMode(structuredClone(progress), mode)),
    resetAll: () => withSvc(async s => await s.resetAll()),
  };
}
