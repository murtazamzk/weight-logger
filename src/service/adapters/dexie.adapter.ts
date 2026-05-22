import type { WeightRepository } from "../repository";
import { db } from "../db";

export const dexieAdapter: WeightRepository = {
  async getAll() {
    const entries = await db.entries
      .orderBy("date")
      .filter((entry) => entry.pendingDelete !== true)
      .toArray();
    return entries.map((entry) => {
      const { synced, remoteId, pendingDelete, ...publicEntry } = entry;
      return publicEntry;
    });
  },

  async add(entry) {
    const id = await db.entries.add({
      ...entry,
      synced: false,
      pendingDelete: false,
    });
    return { ...entry, id };
  },
};
