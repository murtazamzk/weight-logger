import Dexie, { type Table } from "dexie";
import type { WeightEntry } from "./repository";

export interface LocalWeightEntry extends Omit<WeightEntry, "id"> {
  id?: number;
  synced?: boolean;
  remoteId?: number | string;
  pendingDelete?: boolean;
}

class WeightDB extends Dexie {
  entries!: Table<LocalWeightEntry, number>;

  constructor() {
    super("WeightLogger");
    this.version(1).stores({
      entries: "++id, date, synced, remoteId, pendingDelete",
    });
  }
}

export const db = new WeightDB();
