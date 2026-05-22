import Dexie, { type Table } from "dexie";

export interface WeightEntry {
  id?: number;
  weight: number;
  date: string;
  note?: string;
}

class WeightDB extends Dexie {
  entries!: Table<WeightEntry>;

  constructor() {
    super("WeightLogger");
    this.version(1).stores({
      entries: "++id, date",
    });
  }
}

export const db = new WeightDB();
