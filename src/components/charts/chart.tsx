import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeightEntry } from "../../service/db";

const ranges = [7, 30, 90] as const;
type Range = (typeof ranges)[number];

type ChartProps = {
  entries: WeightEntry[];
};

function formatDateLabel(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function aggregateEntries(entries: WeightEntry[], range: Range) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range + 1);
  cutoff.setHours(0, 0, 0, 0);

  const inRange = entries.filter(
    (e) => new Date(e.date + "T00:00:00") >= cutoff,
  );

  if (range <= 30) {
    // daily points
    const byDay = new Map<string, number[]>();
    for (const e of inRange) {
      const arr = byDay.get(e.date) ?? [];
      arr.push(e.weight);
      byDay.set(e.date, arr);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weights]) => ({
        date,
        label: formatDateLabel(date),
        weight: parseFloat(
          (weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1),
        ),
      }));
  } else {
    // weekly aggregation
    const byWeek = new Map<string, number[]>();
    for (const e of inRange) {
      const d = new Date(e.date + "T00:00:00");
      // ISO week start (Monday)
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      const key = d.toISOString().split("T")[0];
      const arr = byWeek.get(key) ?? [];
      arr.push(e.weight);
      byWeek.set(key, arr);
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weights]) => ({
        date,
        label: "Wk " + formatDateLabel(date),
        weight: parseFloat(
          (weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1),
        ),
      }));
  }
}

export default function Chart({ entries }: ChartProps) {
  const [range, setRange] = useState<Range>(7);

  const data = useMemo(
    () => aggregateEntries(entries, range),
    [entries, range],
  );

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [entries],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Chart card */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Weight trend
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Last {range} days
            </p>
          </div>
          <div className="flex gap-1.5">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition ${
                  range === r
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 h-40 text-slate-400 dark:text-slate-500 text-sm gap-2">
            <span className="text-2xl">📊</span>
            No data for the last {range} days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                unit=" kg"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.85rem",
                }}
                formatter={(val) => [`${val} kg`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#6366f1" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Last 8 entries list */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Recent entries
        </h2>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 h-32 text-slate-400 dark:text-slate-500 text-sm gap-2">
            <span className="text-2xl">🏋️</span>
            No entries yet
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {sorted.map((entry) => (
              <li
                key={entry.id ?? entry.date + entry.weight}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {formatDateLabel(entry.date)}
                  </span>
                  {entry.note && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]">
                      {entry.note}
                    </span>
                  )}
                </div>
                <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                  {entry.weight} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
