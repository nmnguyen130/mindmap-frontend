import { getDB } from "../client";
import type { ChangeRow } from "../types";

const now = () => Date.now();
const CLEANUP_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const changeQueries = {
  async getPending(): Promise<ChangeRow[]> {
    const db = await getDB();
    return db.getAllAsync<ChangeRow>(
      "SELECT * FROM changes WHERE synced = 0 ORDER BY changed_at ASC"
    );
  },

  async markAsSynced(changes: ChangeRow[]): Promise<void> {
    if (changes.length === 0) return;
    const db = await getDB();
    const timestamp = now();

    await db.withTransactionAsync(async () => {
      // Delete processed changes
      const placeholders = changes.map(() => "?").join(",");
      await db.runAsync(
        `DELETE FROM changes WHERE id IN (${placeholders})`,
        changes.map((c) => c.id)
      );

      // Update is_synced for affected records
      const groups = new Map<string, Set<string>>();
      for (const c of changes) {
        const set = groups.get(c.table_name) ?? new Set<string>();
        set.add(c.record_id);
        groups.set(c.table_name, set);
      }

      for (const [table, ids] of groups) {
        const list = Array.from(ids);
        const ph = list.map(() => "?").join(",");
        await db.runAsync(
          `UPDATE ${table} SET is_synced = 1, last_synced_at = ? WHERE id IN (${ph})`,
          [timestamp, ...list]
        );
      }
    });
  },

  async getCount(): Promise<number> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM changes WHERE synced = 0"
    );
    return row?.count ?? 0;
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.runAsync("DELETE FROM changes");
  },

  // Cleanup old synced deleted records (hard delete after 30 days)
  async cleanupDeletedRecords(): Promise<void> {
    const db = await getDB();
    const threshold = now() - CLEANUP_RETENTION_DAYS * MS_PER_DAY;

    await db.withTransactionAsync(async () => {
      // Hard delete old soft-deleted records that are synced
      await db.runAsync(
        "DELETE FROM connections WHERE deleted_at < ? AND is_synced = 1",
        [threshold]
      );
      await db.runAsync(
        "DELETE FROM mindmap_nodes WHERE deleted_at < ? AND is_synced = 1",
        [threshold]
      );
      await db.runAsync(
        "DELETE FROM mindmaps WHERE deleted_at < ? AND is_synced = 1",
        [threshold]
      );
    });
  },

  // Get last sync timestamp from settings
  async getLastSyncTimestamp(): Promise<number> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'last_sync_at'"
    );
    return row ? parseInt(row.value, 10) : 0;
  },

  // Save last sync timestamp to settings
  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES ('last_sync_at', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [timestamp.toString(), now()]
    );
  },
};
