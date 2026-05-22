import type { WeightRepository } from "./repository";
import { dexieAdapter } from "./adapters/dexie.adapter";
import { supabaseAdapter } from "./adapters/supabase.adapter";
import { db } from "./db";

export type { WeightEntry, WeightRepository } from "./repository";

const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;
let syncing = false;

function emitSyncEvent(syncingState: boolean, lastSynced?: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("weight-sync", {
        detail: { syncing: syncingState, lastSynced },
      }),
    );
  } catch (e) {
    // ignore
  }
}

async function syncPending() {
  if (!isOnline() || syncing) return;
  syncing = true;
  emitSyncEvent(true);

  try {
    let didSyncAny = false;
    const pendingAdds = await db.entries
      .filter((entry) => !entry.synced && !entry.pendingDelete)
      .toArray();

    for (const local of pendingAdds) {
      try {
        const remote = await supabaseAdapter.add({
          weight: local.weight,
          date: local.date,
          note: local.note,
        });
        await db.entries.update(local.id!, {
          synced: true,
          remoteId: remote.id,
        });
        didSyncAny = true;
      } catch (error) {
        console.error("Sync add failed:", error);
      }
    }

    let remoteEntries = [] as any[];
    try {
      remoteEntries = await supabaseAdapter.getAll();
    } catch (err) {
      console.error("Failed to fetch remote entries during sync:", err);
      // If we can't fetch remote entries, avoid destructive reconciliation
      // so local unsynced data isn't accidentally removed.
      return;
    }

    const remoteIds = remoteEntries.map((entry) => entry.id);

    const localSynced = await db.entries
      .filter((entry) => entry.remoteId != null)
      .toArray();

    for (const local of localSynced) {
      if (local.remoteId == null) continue;
      if (!remoteIds.includes(local.remoteId)) {
        await db.entries.delete(local.id!);
      }
    }

    for (const remote of remoteEntries) {
      const existing = await db.entries
        .filter((entry) => entry.remoteId === remote.id)
        .first();

      if (existing) {
        await db.entries.update(existing.id!, {
          weight: remote.weight,
          date: remote.date,
          note: remote.note,
          synced: true,
          pendingDelete: false,
        });
        didSyncAny = true;
      } else {
        await db.entries.add({
          weight: remote.weight,
          date: remote.date,
          note: remote.note,
          synced: true,
          remoteId: remote.id,
          pendingDelete: false,
        });
        didSyncAny = true;
      }
    }
    if (didSyncAny) {
      const last = new Date().toISOString();
      emitSyncEvent(false, last);
    }
  } finally {
    syncing = false;
    emitSyncEvent(false);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncPending().catch((error) => console.error("Online sync failed:", error));
  });
}

export const repo: WeightRepository = {
  async getAll() {
    if (isOnline()) {
      await syncPending();
      try {
        // After syncing, prefer the local IndexedDB cache so entries
        // created while offline are visible immediately in the UI.
        return await dexieAdapter.getAll();
      } catch (error) {
        console.warn(
          "Failed to load from IndexedDB after sync, falling back to Supabase:",
          error,
        );
        try {
          return await supabaseAdapter.getAll();
        } catch (err) {
          console.warn("Failed to load from Supabase:", err);
        }
      }
    }
    return dexieAdapter.getAll();
  },

  async add(entry) {
    const local = await dexieAdapter.add(entry);

    if (isOnline()) {
      try {
        const remote = await supabaseAdapter.add(entry);
        await db.entries.update(local.id as number, {
          synced: true,
          remoteId: remote.id,
        });
      } catch (error) {
        console.warn(
          "Failed to save to Supabase, entry will sync later:",
          error,
        );
      }
    }

    return local;
  },
};
