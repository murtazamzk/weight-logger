import { useEffect, useState } from "react";
import "./index.css";
import Form from "./components/form";
import Chart, { RecentEntries } from "./components/charts";
import { repo, type WeightEntry } from "./service";

type LoadState = "loading" | "ready" | "error";

const connectionLabel = (online: boolean) => (online ? "Online" : "Offline");

function App() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [online, setOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEntries = async () => {
      if (!mounted) return;
      setLoadState("loading");
      try {
        const rows = await repo.getAll();
        if (!mounted) return;
        setEntries(rows);
        setLoadState("ready");
      } catch (err) {
        console.error("Failed to load entries:", err);
        if (!mounted) return;
        setLoadState("error");
      }
    };

    loadEntries();

    const handleOnline = () => {
      setOnline(true);
      loadEntries();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    const handleSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        syncing?: boolean;
        lastSynced?: string;
      };
      if (typeof detail?.syncing === "boolean") setSyncing(detail.syncing);
      if (detail?.lastSynced) setLastSynced(detail.lastSynced);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("weight-sync", handleSyncEvent as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("weight-sync", handleSyncEvent as EventListener);
    };
  }, []);

  const handleAdd = (entry: WeightEntry) => {
    setEntries((current) =>
      [...current, entry].sort((a, b) => a.date.localeCompare(b.date)),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Weight Logger
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Track your weight over time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                online
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
                  : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600"
              }`}
            >
              {connectionLabel(online)}
            </span>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {syncing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-300 border-t-indigo-500 rounded-full" />
                  <span>Syncing…</span>
                </span>
              ) : lastSynced ? (
                <span>Last sync: {new Date(lastSynced).toLocaleString()}</span>
              ) : (
                <span>Not synced</span>
              )}
            </div>
          </div>
        </header>

        {loadState === "loading" && (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <span className="animate-spin inline-block w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full" />
            Loading your data…
          </div>
        )}

        {loadState === "error" && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-sm"
          >
            ⚠️ Failed to load your weight history. Please refresh and try again.
          </div>
        )}

        {loadState === "ready" && (
          <div className="space-y-6">
            <Chart entries={entries} />
            <div className="grid gap-6 items-stretch lg:grid-cols-[minmax(320px,420px)_1fr]">
              <Form onAdd={handleAdd} />
              <RecentEntries entries={entries} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
