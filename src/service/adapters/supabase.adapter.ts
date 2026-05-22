import type { WeightEntry, WeightRepository } from "../repository";

// ---------------------------------------------------------------------------
// Mock persistent store — simulates a Postgres table using localStorage.
// ---------------------------------------------------------------------------
const STORAGE_KEY = "mock-supabase-health_metrics";

let store: WeightEntry[] = [];
let nextId = 1;

function loadStore() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeightEntry[];
      store = Array.isArray(parsed) ? parsed : [];
      nextId = store.reduce((max, entry) => {
        if (typeof entry.id === "number" && entry.id > max) return entry.id;
        return max;
      }, 0) + 1;
    }
  } catch {
    store = [];
    nextId = 1;
  }
}

function saveStore() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failure
  }
}

loadStore();

function simulateLatency() {
  return new Promise((res) => setTimeout(res, 80));
}

// ---------------------------------------------------------------------------
// Mock query builder — mirrors supabase-js chaining API
// ---------------------------------------------------------------------------
type Row = WeightEntry & { id: number };

interface SelectBuilder {
  order(
    column: keyof Row,
    opts: { ascending: boolean },
  ): Promise<{ data: Row[]; error: null }>;
}

interface InsertBuilder {
  select(): Promise<{ data: Row[]; error: null }>;
}

interface DeleteBuilder {
  eq(column: keyof Row, value: unknown): Promise<{ data: null; error: null }>;
}

interface TableBuilder {
  select(columns?: string): SelectBuilder;
  insert(row: Omit<Row, "id">): InsertBuilder;
  delete(): DeleteBuilder;
}

function from(_table: "health_metrics"): TableBuilder {
  return {
    select(_columns = "*") {
      return {
        async order(column, { ascending }) {
          await simulateLatency();
          const sorted = [...store].sort((a, b) => {
            const av = a[column as keyof WeightEntry] ?? "";
            const bv = b[column as keyof WeightEntry] ?? "";
            return ascending
              ? String(av).localeCompare(String(bv))
              : String(bv).localeCompare(String(av));
          });
          return { data: sorted as Row[], error: null };
        },
      };
    },

    insert(row) {
      return {
        async select() {
          await simulateLatency();
          const saved: Row = { ...row, id: nextId++ };
          store.push(saved);
          saveStore();
          return { data: [saved], error: null };
        },
      };
    },

    delete() {
      return {
        async eq(column, value) {
          await simulateLatency();
          store = store.filter((r) => r[column as keyof WeightEntry] !== value);
          saveStore();
          return { data: null, error: null };
        },
      };
    },
  };
}

const mockSupabase = { from };

// ---------------------------------------------------------------------------
// WeightRepository implementation using the mock client
// ---------------------------------------------------------------------------
export const supabaseAdapter: WeightRepository = {
  async getAll() {
    const { data, error } = await mockSupabase
      .from("health_metrics")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw new Error("supabase: failed to load entries");
    return data;
  },

  async add(entry) {
    const { data, error } = await mockSupabase
      .from("health_metrics")
      .insert(entry as Omit<Row, "id">)
      .select();

    if (error || !data[0]) throw new Error("supabase: failed to insert entry");
    return data[0];
  },
};
