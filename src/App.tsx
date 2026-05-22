import { useEffect, useState } from "react";
import "./index.css";
import Form from "./components/form";
import Chart from "./components/charts";
import { db, type WeightEntry } from "./service/db";

type LoadState = "loading" | "ready" | "error";

function App() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    db.entries
      .orderBy("date")
      .toArray()
      .then((rows) => {
        setEntries(rows);
        setLoadState("ready");
      })
      .catch((err) => {
        console.error("Failed to load entries from IndexedDB:", err);
        setLoadState("error");
      });
  }, []);

  const handleAdd = (entry: WeightEntry) => {
    setEntries((current) => [...current, entry]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Weight Logger
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your weight over time.
          </p>
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
            ⚠️ Failed to load your weight history from local storage. Please
            refresh and try again.
          </div>
        )}

        {loadState === "ready" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <Form onAdd={handleAdd} />
            <Chart entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
