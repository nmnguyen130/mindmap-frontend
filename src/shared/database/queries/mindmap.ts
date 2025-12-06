import { getDB } from "../client";
import type { MindMapRow, MindMapNodeRow, ConnectionRow, FullMindMap } from "../types";

const now = () => Date.now();

export const mindmapQueries = {
  async getAll(): Promise<MindMapRow[]> {
    const db = await getDB();
    return db.getAllAsync(
      "SELECT * FROM mindmaps WHERE deleted_at IS NULL ORDER BY updated_at DESC"
    );
  },

  async get(id: string): Promise<MindMapRow | null> {
    const db = await getDB();
    return db.getFirstAsync(
      "SELECT * FROM mindmaps WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
  },

  async getFull(id: string): Promise<FullMindMap | null> {
    const mindMap = await this.get(id);
    if (!mindMap) return null;

    const db = await getDB();
    const [nodes, connections] = await Promise.all([
      db.getAllAsync<MindMapNodeRow>(
        "SELECT * FROM mindmap_nodes WHERE mindmap_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
        [id]
      ),
      db.getAllAsync<ConnectionRow>(
        "SELECT * FROM connections WHERE mindmap_id = ? AND deleted_at IS NULL",
        [id]
      ),
    ]);

    return { mindMap, nodes, connections };
  },

  async create(data: {
    id: string;
    title: string;
    central_topic?: string;
    summary?: string;
    document_id?: string;
  }): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO mindmaps (id, title, central_topic, summary, document_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.id,
        data.title,
        data.central_topic ?? null,
        data.summary ?? null,
        data.document_id ?? null,
      ]
    );
  },

  async update(
    id: string,
    updates: Partial<
      Pick<MindMapRow, "title" | "central_topic" | "summary" | "document_id">
    >
  ): Promise<void> {
    const db = await getDB();
    const sets: string[] = ["updated_at = ?", "version = version + 1", "is_synced = 0"];
    const values: (string | number | null)[] = [now()];

    if (updates.title !== undefined) {
      sets.push("title = ?");
      values.push(updates.title);
    }
    if (updates.central_topic !== undefined) {
      sets.push("central_topic = ?");
      values.push(updates.central_topic);
    }
    if (updates.summary !== undefined) {
      sets.push("summary = ?");
      values.push(updates.summary);
    }
    if (updates.document_id !== undefined) {
      sets.push("document_id = ?");
      values.push(updates.document_id);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE mindmaps SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      values
    );
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE mindmaps SET 
        deleted_at = ?, 
        updated_at = ?, 
        version = version + 1, 
        is_synced = 0 
      WHERE id = ? AND deleted_at IS NULL`,
      [now(), now(), id]
    );
  },

  // Sync down: get records updated after timestamp
  async getUpdatedAfter(timestamp: number): Promise<MindMapRow[]> {
    const db = await getDB();
    return db.getAllAsync<MindMapRow>(
      "SELECT * FROM mindmaps WHERE updated_at > ?",
      [timestamp]
    );
  },
};
