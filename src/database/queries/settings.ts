import { getDB } from "../client";

const now = () => Date.now();

export const settingsQueries = {
  async get(key: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [key]
    );
    return row?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now()]
    );
  },

  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.runAsync("DELETE FROM settings WHERE key = ?", [key]);
  },
};
