import { getDB } from "../client";
import type { ConnectionRow } from "../types";

const now = () => Date.now();

export const connectionQueries = {
  async getByMindmap(mindmapId: string): Promise<ConnectionRow[]> {
    const db = await getDB();
    return db.getAllAsync<ConnectionRow>(
      "SELECT * FROM connections WHERE mindmap_id = ? AND deleted_at IS NULL",
      [mindmapId]
    );
  },

  async get(id: string): Promise<ConnectionRow | null> {
    const db = await getDB();
    return db.getFirstAsync<ConnectionRow>(
      "SELECT * FROM connections WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
  },

  async create(conn: {
    id: string;
    mindmap_id: string;
    from_node_id: string;
    to_node_id: string;
    relationship?: string;
  }): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO connections (id, mindmap_id, from_node_id, to_node_id, relationship)
       VALUES (?, ?, ?, ?, ?)`,
      [
        conn.id,
        conn.mindmap_id,
        conn.from_node_id,
        conn.to_node_id,
        conn.relationship ?? null,
      ]
    );
  },

  async update(
    id: string,
    updates: Partial<Pick<ConnectionRow, "relationship" | "from_node_id" | "to_node_id">>
  ): Promise<void> {
    const db = await getDB();
    const sets: string[] = ["updated_at = ?", "version = version + 1", "is_synced = 0"];
    const values: (string | number | null)[] = [now()];

    if (updates.relationship !== undefined) {
      sets.push("relationship = ?");
      values.push(updates.relationship);
    }
    if (updates.from_node_id !== undefined) {
      sets.push("from_node_id = ?");
      values.push(updates.from_node_id);
    }
    if (updates.to_node_id !== undefined) {
      sets.push("to_node_id = ?");
      values.push(updates.to_node_id);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE connections SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      values
    );
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE connections SET 
        deleted_at = ?, 
        updated_at = ?, 
        version = version + 1, 
        is_synced = 0 
      WHERE id = ? AND deleted_at IS NULL`,
      [now(), now(), id]
    );
  },

  async deleteByNode(nodeId: string): Promise<void> {
    const db = await getDB();
    const timestamp = now();
    await db.runAsync(
      `UPDATE connections SET 
        deleted_at = ?, 
        updated_at = ?, 
        version = version + 1, 
        is_synced = 0 
      WHERE (from_node_id = ? OR to_node_id = ?) AND deleted_at IS NULL`,
      [timestamp, timestamp, nodeId, nodeId]
    );
  },

  // Sync down: get records updated after timestamp
  async getUpdatedAfter(timestamp: number): Promise<ConnectionRow[]> {
    const db = await getDB();
    return db.getAllAsync<ConnectionRow>(
      "SELECT * FROM connections WHERE updated_at > ?",
      [timestamp]
    );
  },
};
