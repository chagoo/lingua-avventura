import React, { useState, useEffect, useMemo } from "react";
import { onAuth, logout, checkIsAdmin, isSupabaseConfigured } from "./services/supabase";
import LoginForm from "./components/LoginForm";

import { useProgress } from "./hooks/useProgress";
import { usePack } from "./hooks/usePack";
import { fetchAvailablePacks } from "./services/packsApi";
import Chip from "./components/Chip";
import Card from "./components/Card";
import Tabs from "./components/Tabs";
import Dashboard from "./components/Dashboard";
import Flashcards from "./components/Flashcards";
import Quiz from "./components/Quiz";
import Matching from "./components/Matching";
import DailyReview from "./components/DailyReview";
import MouseAndCheese from "./components/MouseAndCheese";
import MiniDialogues from "./components/MiniDialogues";
import Button from "./components/Button";
import { generateDailyActivities } from "./utils/dailyActivities";
import PackManager from "./components/PackManager";
import AdminManager from "./components/AdminManager";

// Root: maneja auth y solo monta AppShell cuando hay usuario
const LOCAL_USER = { id: "local-user", email: "offline@lingua.local" };

export default function Root() {
  const [supabaseEnabled, setSupabaseEnabled] = useState(() => isSupabaseConfigured());
  const [user, setUser] = useState(() => (supabaseEnabled ? null : LOCAL_USER));
  const [checking, setChecking] = useState(supabaseEnabled);

  useEffect(() => {
    if (supabaseEnabled) return () => {};
    let attempts = 0;
    const maxAttempts = 20; // ~10s (20 * 500ms)
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      if (isSupabaseConfigured()) {
        clearInterval(timer);
        if (!cancelled) setSupabaseEnabled(true);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled) {
      setChecking(false);
      setUser(LOCAL_USER);
      return () => {};
    }
    setChecking(true);
    setUser(null);
    return onAuth(u => {
      setUser(u);
      setChecking(false);
    });
  }, [supabaseEnabled]);

  if (checking) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (!user) return <LoginForm />;

  return <AppShell user={user} supabaseEnabled={supabaseEnabled} />;
}

// AppShell: contiene todos los demás hooks (orden estable)
function AppShell({ user, supabaseEnabled }) {
  // IMPORTANTE: el orden de hooks debe ser estable entre renders.
  // No colocar returns condicionales antes de declarar todos los hooks.
  const { progress, loading, error, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll, setThemeMode } = useProgress();
  const [tab, setTab] = useState("dashboard");
  // Nuevo: modo de tema ('light' | 'dark' | 'auto') y preferencia del sistema
  const [themeMode, setThemeModeState] = useState('auto');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [packName, setPackName] = useState('default');
  const [availablePacks, setAvailablePacks] = useState(['default']);
  // Idioma para narración (guardado en progreso) y uno independiente para vocabulario
  const narrationLang = progress?.settings?.narrationMode || 'it';
  const [vocabLang, setVocabLang] = useState(() => narrationLang);

  // Derivamos lang aún si progress no está listo; así evitamos montar un hook extra luego.
  const { pack, loading: packLoading, error: packError } = usePack(vocabLang, packName);

  // Cargar lista de packs disponibles (Supabase) una vez que se conozca el idioma
  useEffect(() => {
    let cancelled = false;
    fetchAvailablePacks(vocabLang).then(list => {
      if (!cancelled && Array.isArray(list) && list.length) {
        setAvailablePacks(list);
        if (!list.includes(packName)) setPackName(list[0]);
      }
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  }, [vocabLang]);

  const userId = (user?.id || user?.uid || "").toString();
  const shortId = userId ? `${userId.slice(0, 8)}…` : null;

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!supabaseEnabled) {
      setIsAdmin(false);
      return () => {};
    }
    let active = true;
    checkIsAdmin().then(v => { if (active) setIsAdmin(!!v); });
    return () => { active = false; };
  }, [supabaseEnabled, user?.id, user?.email]);

  const tabs = useMemo(() => {
    const base = [
      { value: "dashboard", label: "Inicio" },
      { value: "flash", label: "Flashcards" },
      { value: "quiz", label: "Quiz" },
      { value: "match", label: "Memoria" },
      { value: "review", label: "Revisión" },
      { value: "dialogues", label: "Diálogos" },
      { value: "game", label: "Juego 🧀" },
    ];
    if (isAdmin) {
      base.push({ value: "packs", label: "Packs" });
      base.push({ value: "admin", label: "Admin" });
    }
    return generateDailyActivities(base);
  }, [isAdmin]);

  // NOTA: No retornamos todavía (loading/error) para no alterar orden de hooks.

  // Handlers
  const onFlashcardsComplete = () => { incrementCompletion("flashcards"); awardXP(20); alert("¡Flashcards listas!"); };
  const onQuizComplete = (score) => { incrementCompletion("quiz"); awardXP(10 * score); alert(`Quiz terminado. Puntuación: ${score}`); };
  const onMatchingComplete = () => { incrementCompletion("matching"); awardXP(30); alert("¡Bien! Memoria completada."); };
  const onReviewComplete = (score) => { incrementCompletion("review"); awardXP(12 * score); alert(`Revisión completa. Puntos: ${score}`); };
  const onDialoguesComplete = () => { incrementCompletion("dialogues"); alert("¡Diálogos completados!"); };
  const onEatCheese = (word) => { incrementCompletion("gameCheeseEaten"); markLearned(word); };

  // Detectar preferencia del sistema (para modo auto)
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setSystemPrefersDark(mq.matches);
      handler();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {}
  }, []);

  // Sincronizar una sola vez desde progreso o localStorage al montar / cuando llegue progreso
  useEffect(() => {
    if (!progress) return; // esperar
    const remote = progress.settings?.theme;
    const stored = localStorage.getItem('la_theme');
    // Prioridad: remoto -> stored -> auto
    const desired = remote || stored || 'auto';
    if (desired !== themeMode) setThemeModeState(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.settings?.theme]);

  // Persistir cambios locales (localStorage + remoto si difiere)
  useEffect(() => {
    // Guardar sólo si cambió realmente el modo (evita loop)
    const stored = localStorage.getItem('la_theme');
    if (stored !== themeMode) localStorage.setItem('la_theme', themeMode);
    const remote = progress?.settings?.theme;
    if (remote && remote !== themeMode) {
      // Evitar spam: lanzar actualización pero no re-sincronizar hasta que remoto cambie
      setThemeMode(themeMode);
    }
  }, [themeMode]);

  // Calcular booleano dark efectivo
  const dark = themeMode === 'dark' || (themeMode === 'auto' && systemPrefersDark);

  // Atajo de teclado: tecla "d" para togglear tema (ignorar si se escribe en input / textarea / editable)
  useEffect(() => {
    const handler = (e) => {
      if (e.key.toLowerCase() === 'd') {
        const tag = (e.target?.tagName || '').toLowerCase();
        const editable = e.target?.isContentEditable;
        if (['input','textarea','select'].includes(tag) || editable) return;
        setThemeModeState(m => m === 'dark' ? 'light' : 'dark');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Safe redirection post-hooks
  if (!isAdmin && (tab === 'packs' || tab === 'admin')) {
    queueMicrotask(() => setTab('dashboard'));
  }
  if (loading) return <div style={{ padding:16 }}>Cargando progreso…</div>;
  if (error)   return <div style={{ padding:16, color:'#b00' }}>Error cargando progreso: {error.message}</div>;
  if (!progress) return <div style={{ padding:16 }}>Sin datos de progreso.</div>;

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-emerald-50 text-neutral-900 dark:from-neutral-900 dark:to-neutral-900 dark:text-neutral-100">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-neutral-200 dark:bg-neutral-800/70 dark:border-neutral-700">
          <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍝</span>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Lingua Avventura</h1>
              <Chip>Idiomas para hispanohablantes</Chip>
              {!supabaseEnabled && <Chip>Modo offline</Chip>}
              {isAdmin && <Chip>Admin</Chip>}
            </div>
            <div className="flex items-center gap-2">
              {shortId && (
                <span className="text-xs text-neutral-500">UID: {shortId}</span>
              )}
              <select
                className="px-3 py-2 rounded-xl border border-neutral-300 bg-white dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                value={narrationLang}
                onChange={(e) => setNarrationMode(e.target.value)}
              >
                <option value="it">Narración: Italiano</option>
                <option value="fr">Narración: Francés</option>
                <option value="en">Narración: Inglés</option>
              </select>
              <select
                className="px-3 py-2 rounded-xl border border-neutral-300 bg-white dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                value={vocabLang}
                onChange={(e)=>{ setVocabLang(e.target.value); setPackName('default'); }}
              >
                <option value="it">Vocab: Italiano</option>
                <option value="fr">Vocab: Francés</option>
                <option value="en">Vocab: Inglés</option>
              </select>
              <select
                className="px-3 py-2 rounded-xl border border-neutral-300 bg-white dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                value={packName}
                onChange={e=>setPackName(e.target.value)}
              >
                {availablePacks.map(p=> <option key={p} value={p}>{`Pack: ${p}`}</option>)}
              </select>
              {/* Chip de progreso del pack actual */}
              {pack && Array.isArray(pack) && pack.length > 0 && (
                (()=>{
                  const total = pack.length;
                  const learned = (progress?.wordsLearned) ? pack.filter(w => {
                    const key = w[vocabLang];
                    return key && progress.wordsLearned[key];
                  }).length : 0;
                  const pct = Math.round((learned/total)*100);
                  return <Chip>{learned}/{total} ({pct}%)</Chip>;
                })()
              )}
              <Button variant="outline" className="px-3" onClick={resetAll}>Reiniciar progreso</Button>
              <button
                type="button"
                onClick={() => setThemeModeState(m => m === 'dark' ? 'light' : 'dark')}
                aria-label={dark ? 'Cambiar a modo claro (atajo: d)' : 'Cambiar a modo oscuro (atajo: d)'}
                className="group w-10 h-10 inline-flex items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors relative overflow-hidden"
                title={dark ? 'Modo claro (tecla d)' : 'Modo oscuro (tecla d)'}
              >
                <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity bg-amber-400 dark:bg-neutral-50 mix-blend-multiply" />
                <span className={`transition-transform duration-300 ease-out ${dark ? 'rotate-0 scale-100' : 'rotate-180 scale-90'}`}>
                  {dark ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 drop-shadow-sm">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-700 dark:text-neutral-200 drop-shadow-sm">
                      <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
                    </svg>
                  )}
                </span>
              </button>
              {supabaseEnabled && <Button variant="ghost" className="px-3" onClick={logout}>Salir</Button>}
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">
          {!supabaseEnabled && (
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
              Supabase no está configurado. El progreso se guardará solo en este dispositivo.
            </p>
          )}
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {packLoading && (
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
              Cargando vocabulario desde la API…
            </p>
          )}
          {packError && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              No se pudo cargar el vocabulario remoto ({packError.message}). Usando datos locales.
            </p>
          )}
          {tab === "dashboard" && <Dashboard progress={progress} />}
          {tab === "flash" && (
            <Flashcards
              pack={pack}
              lang={vocabLang}
              onComplete={() => { incrementCompletion("flashcards"); awardXP(20); alert("¡Flashcards listas!"); }}
              onLearned={markLearned}
              progress={progress}
              onResetPack={() => {
                if (!pack || !Array.isArray(pack)) return;
                // resetPackProgress expuesto por hook? si no, usamos markLearned reverse (ya tenemos helper en hook?)
                // Asumimos que useProgress expone resetPackProgress si lo añadimos previamente.
                if (typeof progress?.resetPackProgress === 'function') {
                  progress.resetPackProgress(vocabLang, pack.map(w=>w[vocabLang]).filter(Boolean));
                } else if (typeof window.resetPackProgress === 'function') {
                  window.resetPackProgress(vocabLang, pack.map(w=>w[vocabLang]).filter(Boolean));
                } else {
                  // fallback: reconstruir state manual no disponible aquí.
                }
              }}
            />
          )}
          {tab === "quiz" && (
            <Quiz
              pack={pack}
              lang={vocabLang}
              onComplete={(score)=>{ incrementCompletion("quiz"); awardXP(10*score); alert(`Quiz terminado. Puntuación: ${score}`); }}
              onLearned={markLearned}
              awardXP={awardXP}
            />
          )}
          {tab === "match" && (
            <Matching
              pack={pack}
              lang={vocabLang}
              onComplete={()=>{ incrementCompletion("matching"); awardXP(30); alert("¡Bien! Memoria completada."); }}
              onLearned={markLearned}
            />
          )}
          {tab === "review" && (
            <DailyReview
              pack={pack}
              lang={vocabLang}
              onComplete={(score)=>{ incrementCompletion("review"); awardXP(12*score); alert(`Revisión completa. Puntos: ${score}`); }}
              awardXP={awardXP}
              progress={progress}
            />
          )}
          {tab === "dialogues" && (
            <MiniDialogues
              pack={pack}
              lang={vocabLang}
              onComplete={()=>{ incrementCompletion("dialogues"); alert("¡Diálogos completados!"); }}
              awardXP={awardXP}
            />
          )}
          {tab === "game" && (
            <MouseAndCheese
              pack={pack}
              lang={vocabLang}
              onEatCheese={(w)=>{ incrementCompletion("gameCheeseEaten"); markLearned(w); }}
            />
          )}
          {tab === "packs" && isAdmin && (
            <PackManager
              onCreated={({ packName: newPack, lang: newLang }) => {
                if (newLang === vocabLang) {
                  setAvailablePacks(prev => prev.includes(newPack) ? prev : [...prev, newPack]);
                  setPackName(newPack);
                }
              }}
              onMigrated={({ newLang }) => {
                // Si después de migrar el idioma del pack coincide con vocabLang, refrescamos lista
                if (newLang === vocabLang) {
                  fetchAvailablePacks(vocabLang).then(list => {
                    if (Array.isArray(list)) setAvailablePacks(list);
                  });
                }
              }}
              onRenamed={({ lang: rLang, fromPack, toPack }) => {
                if (rLang === vocabLang) {
                  // Refrescamos packs remotos para asegurar consistencia
                  fetchAvailablePacks(vocabLang).then(list => {
                    if (Array.isArray(list)) setAvailablePacks(list);
                  });
                  // Si el usuario estaba en el pack renombrado, pasar al nuevo nombre
                  setPackName(prev => prev === fromPack ? toPack : prev);
                }
              }}
            />
          )}
          {tab === "admin" && isAdmin && (
            <AdminManager />
          )}
          <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Consejo del día" subtitle="Hábitos que funcionan">
              <ul className="list-disc ml-5 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                <li>Estudia 10–15 min diarios para mantener la racha.</li>
                <li>Repite en voz alta y grábate.</li>
                <li>Varía actividades.</li>
              </ul>
            </Card>
            <Card title="Meta diaria" subtitle="Objetivo sugerido">
              <p className="text-sm">Aprender 5 palabras y 1 partida del juego.</p>
            </Card>
            <Card title="Acerca del paquete" subtitle="Personalizable">
              <p className="text-sm">Edita vocabulario en src/data/packs.json (la API usa el mismo archivo).</p>
            </Card>
          </section>
        </main>
        <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Hecho con ❤️ para aprender idiomas. <span className="opacity-60">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}</span>
        </footer>
      </div>
    </div>
  );
}
