import React, { useState, useEffect, useMemo } from "react";
import { onAuth, logout } from "./services/supabase";
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

// Root: maneja auth y solo monta AppShell cuando hay usuario
export default function Root() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    return onAuth(u => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  if (checking) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (!user) return <LoginForm />;

  return <AppShell user={user} />;
}

// AppShell: contiene todos los demás hooks (orden estable)
function AppShell({ user }) {
  // IMPORTANTE: el orden de hooks debe ser estable entre renders.
  // No colocar returns condicionales antes de declarar todos los hooks.
  const { progress, loading, error, awardXP, incrementCompletion, markLearned, setNarrationMode, resetAll } = useProgress();
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(false);
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

  // Determinar si el usuario es admin (por ahora: email listado en VITE_ADMIN_EMAILS o email específico hardcodeado)
  const adminEmails = (import.meta.env?.VITE_ADMIN_EMAILS || 'ing.santiago.v@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (user?.email || '').toLowerCase();
  const isAdmin = userEmail && adminEmails.includes(userEmail);

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
    if (isAdmin) base.push({ value: "packs", label: "Packs" });
    return generateDailyActivities(base);
  }, [isAdmin]);

  // Si el usuario no es admin y estaba en la pestaña packs, lo redirigimos a dashboard
  if (!isAdmin && tab === 'packs') {
    // setTab en render no es ideal, usamos microtask
    queueMicrotask(() => setTab('dashboard'));
  }

  // Ahora sí: renders tempranos controlados SIN introducir nuevos hooks dinámicos.
  if (loading) return <div style={{ padding:16 }}>Cargando progreso…</div>;
  if (error)   return <div style={{ padding:16, color:'#b00' }}>Error cargando progreso: {error.message}</div>;
  if (!progress) return <div style={{ padding:16 }}>Sin datos de progreso.</div>;

  // Handlers
  const onFlashcardsComplete = () => { incrementCompletion("flashcards"); awardXP(20); alert("¡Flashcards listas!"); };
  const onQuizComplete = (score) => { incrementCompletion("quiz"); awardXP(10 * score); alert(`Quiz terminado. Puntuación: ${score}`); };
  const onMatchingComplete = () => { incrementCompletion("matching"); awardXP(30); alert("¡Bien! Memoria completada."); };
  const onReviewComplete = (score) => { incrementCompletion("review"); awardXP(12 * score); alert(`Revisión completa. Puntos: ${score}`); };
  const onDialoguesComplete = () => { incrementCompletion("dialogues"); alert("¡Diálogos completados!"); };
  const onEatCheese = (word) => { incrementCompletion("gameCheeseEaten"); markLearned(word); };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-emerald-50 text-neutral-900 dark:from-neutral-900 dark:to-neutral-900 dark:text-neutral-100">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-neutral-200 dark:bg-neutral-800/70 dark:border-neutral-700">
          <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍝</span>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Lingua Avventura</h1>
              <Chip>Idiomas para hispanohablantes</Chip>
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
              <Button variant="outline" className="px-3" onClick={resetAll}>Reiniciar progreso</Button>
              <Button variant="outline" className="px-3" onClick={() => setDark(d => !d)}>{dark ? "Modo claro" : "Modo oscuro"}</Button>
              <Button variant="ghost" className="px-3" onClick={logout}>Salir</Button>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">
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
