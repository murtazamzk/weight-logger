/**
 * WeightRepository — the single interface the app talks to.
 *
 * Both the Dexie (IndexedDB) adapter and the mock Supabase adapter
 * implement this contract. Swap them by changing the env flag; the
 * rest of the app never knows which backend it's talking to.
 */
export interface WeightEntry {
  id?: number | string;
  weight: number;
  date: string;
  note?: string;
}

export interface WeightRepository {
  /** Load all entries ordered by date ascending. */
  getAll(): Promise<WeightEntry[]>;

  /** Persist a new entry. Returns the saved entry with id populated. */
  add(entry: Omit<WeightEntry, "id">): Promise<WeightEntry>;
}
