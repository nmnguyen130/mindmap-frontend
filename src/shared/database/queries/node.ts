import { getDB } from "../client";
import type { MindMapNodeRow } from "../types";

const now = () => Date.now();

export const nodeQueries = {
  async getByMindmap(mindmapId: string): Promise<MindMapNodeRow[]> {
    const db = await getDB();
    return db.getAllAsync<MindMapNodeRow>(
      "SELECT * FROM mindmap_nodes WHERE mindmap_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
      [mindmapId]
    );
  },

  async get(id: string): Promise<MindMapNodeRow | null> {
    const db = await getDB();
    return db.getFirstAsync<MindMapNodeRow>(
      "SELECT * FROM mindmap_nodes WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
  },

  async create(node: {
    id: string;
    mindmap_id: string;
    label: string;
    keywords?: string;
    level: number;
    parent_id?: string;
    position_x: number;
    position_y: number;
    notes?: string;
  }): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO mindmap_nodes
       (id, mindmap_id, label, keywords, level, parent_id, position_x, position_y, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.mindmap_id,
        node.label,
        node.keywords ?? null,
        node.level,
        node.parent_id ?? null,
        node.position_x,
        node.position_y,
        node.notes ?? null,
      ]
    );
  },

  async update(
    id: string,
    updates: Partial<
      Pick<
        MindMapNodeRow,
        "label" | "keywords" | "level" | "parent_id" | "position_x" | "position_y" | "notes"
      >
    >
  ): Promise<void> {
    const db = await getDB();
    const sets: string[] = ["updated_at = ?", "version = version + 1", "is_synced = 0"];
    const values: (string | number | null)[] = [now()];

    if (updates.label !== undefined) {
      sets.push("label = ?");
      values.push(updates.label);
    }
    if (updates.keywords !== undefined) {
      sets.push("keywords = ?");
      values.push(updates.keywords);
    }
    if (updates.level !== undefined) {
      sets.push("level = ?");
      values.push(updates.level);
    }
    if (updates.parent_id !== undefined) {
      sets.push("parent_id = ?");
      values.push(updates.parent_id);
    }
    if (updates.position_x !== undefined) {
      sets.push("position_x = ?");
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      sets.push("position_y = ?");
      values.push(updates.position_y);
    }
    if (updates.notes !== undefined) {
      sets.push("notes = ?");
      values.push(updates.notes);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE mindmap_nodes SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      values
    );
  },

  async updatePosition(id: string, x: number, y: number): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE mindmap_nodes SET 
        position_x = ?, 
        position_y = ?, 
        updated_at = ?, 
        version = version + 1, 
        is_synced = 0 
      WHERE id = ? AND deleted_at IS NULL`,
      [x, y, now(), id]
    );
  },

  async updatePositionsBatch(
    updates: Array<{ id: string; x: number; y: number }>
  ): Promise<void> {
    if (updates.length === 0) return;
    const db = await getDB();
    const timestamp = now();

    await db.withTransactionAsync(async () => {
      for (const { id, x, y } of updates) {
        await db.runAsync(
          `UPDATE mindmap_nodes SET 
            position_x = ?, 
            position_y = ?, 
            updated_at = ?, 
            version = version + 1, 
            is_synced = 0 
          WHERE id = ? AND deleted_at IS NULL`,
          [x, y, timestamp, id]
        );
      }
    });
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE mindmap_nodes SET 
        deleted_at = ?, 
        updated_at = ?, 
        version = version + 1, 
        is_synced = 0 
      WHERE id = ? AND deleted_at IS NULL`,
      [now(), now(), id]
    );
  },

  // Sync down: get records updated after timestamp
  async getUpdatedAfter(timestamp: number): Promise<MindMapNodeRow[]> {
    const db = await getDB();
    return db.getAllAsync<MindMapNodeRow>(
      "SELECT * FROM mindmap_nodes WHERE updated_at > ?",
      [timestamp]
    );
  },
};
