import { useEffect, useState } from "react";
import { fetchPack } from "../services/packsApi";
import { getPack as getLocalPack } from "../data/packs";

export function usePack(lang, packName = 'default') {
  const [pack, setPack] = useState(() => (getLocalPack(lang) || []).filter(Boolean));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

  setPack((getLocalPack(lang) || []).filter(Boolean));
    setError(null);

    async function load() {
      setLoading(true);
      try {
  let remote = await fetchPack(lang, { packName, signal: controller.signal });
        if (packName && packName !== 'default') {
          // Cuando haya soporte de packs diferenciados se podría filtrar por metadata local
          // Por ahora asumimos que el servidor ya filtra o devolvemos completo y dejamos igual.
          // (Mantener placeholder para futura lógica.)
          remote = remote.filter(Boolean);
        }
        if (!isMounted) return;
  setPack((remote || []).filter(Boolean));
        setError(null);
      } catch (err) {
        if (!isMounted || err.name === "AbortError") return;
        setError(err);
        let local = getLocalPack(lang);
        if (packName && packName !== 'default') {
          // Si en el futuro almacenamos pack en metadata local se filtrará aquí
          local = local.filter(Boolean);
        }
  setPack((local || []).filter(Boolean));
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
  }, [lang, packName]);
  return { pack, loading, error };
}
