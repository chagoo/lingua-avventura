import { useEffect, useState } from "react";
import { fetchPack } from "../services/packsApi";
import { getPack as getLocalPack } from "../data/packs";

export function usePack(lang) {
  const [pack, setPack] = useState(() => getLocalPack(lang));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    setPack(getLocalPack(lang));
    setError(null);

    async function load() {
      setLoading(true);
      try {
        const remotePack = await fetchPack(lang, { signal: controller.signal });
        if (!isMounted) return;
        setPack(remotePack);
        setError(null);
      } catch (err) {
        if (!isMounted || err.name === "AbortError") return;
        setError(err);
        setPack(getLocalPack(lang));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [lang]);

  return { pack, loading, error };
}
