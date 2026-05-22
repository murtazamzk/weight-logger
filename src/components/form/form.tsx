import { useState } from "react";
import { z } from "zod";
import { db, type WeightEntry } from "../../service/db";

const todayString = new Date().toISOString().split("T")[0];

const WeightSchema = z.object({
  weight: z
    .number({ invalid_type_error: "Weight must be a number" })
    .min(30, "Weight must be at least 30 kg")
    .max(300, "Weight must be at most 300 kg"),
  date: z
    .string()
    .nonempty("Date is required")
    .refine((d) => d <= todayString, {
      message: "Date cannot be in the future",
    }),
  note: z.string().optional(),
});

type Errors = Partial<Record<"weight" | "date" | "note", string>>;

type FormProps = {
  onAdd?: (entry: WeightEntry) => void;
};

export default function Form({ onAdd }: FormProps) {
  const [weight, setWeight] = useState<string>("");
  const [date, setDate] = useState<string>(todayString);
  const [note, setNote] = useState<string>("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (weight.trim() === "") {
      setErrors({ weight: "Weight is required" });
      return;
    }

    const parsedWeight = parseFloat(weight);
    const parsed = WeightSchema.safeParse({
      weight: isNaN(parsedWeight) ? undefined : parsedWeight,
      date,
      note: note.trim() || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const entry: WeightEntry = parsed.data;
      const id = await db.entries.add(entry);
      onAdd?.({ ...entry, id });
      setWeight("");
      setNote("");
      setDate(todayString);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save entry:", err);
      setErrors({ note: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Log Weight
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Record a new weight reading
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mt-10">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">
            Weight (kg)
          </label>
          <input
            type="number"
            min={30}
            max={300}
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
              errors.weight
                ? "border-red-400 dark:border-red-500"
                : "border-slate-300 dark:border-slate-600"
            }`}
            placeholder="e.g. 72.5"
          />
          {errors.weight && (
            <p
              className="text-xs text-red-600 dark:text-red-400 mt-1.5"
              role="alert"
            >
              {errors.weight}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">
            Date
          </label>
          <input
            type="date"
            max={todayString}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
              errors.date
                ? "border-red-400 dark:border-red-500"
                : "border-slate-300 dark:border-slate-600"
            }`}
          />
          {errors.date && (
            <p
              className="text-xs text-red-600 dark:text-red-400 mt-1.5"
              role="alert"
            >
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">
          Note <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          placeholder="Anything to remember about this reading…"
        />
        {errors.note && (
          <p
            className="text-xs text-red-600 dark:text-red-400 mt-1.5"
            role="alert"
          >
            {errors.note}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            ✓ Saved
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {saving ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Saving…
            </>
          ) : (
            "Save entry"
          )}
        </button>
      </div>
    </form>
  );
}
