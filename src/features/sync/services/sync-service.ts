import { changeQueries, mindmapQueries } from "@/shared/database";
import type { ChangeRow } from "@/shared/database";
import { API_BASE_URL } from "@/constants/config";
import { getDB } from "@/shared/database/client";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
}

/**
 * SyncService handles bidirectional synchronization between local SQLite and backend.
 * - Push: sends local pending changes to the server
 * - Pull: fetches remote updates and merges into local database
 */
class SyncService {
  private isSyncing = false;

  /**
   * Main sync: push local, then pull remote
   */
  async sync(accessToken: string): Promise<SyncResult> {
    if (this.isSyncing || !accessToken) {
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Push local changes
      const pushResult = await this.pushChanges(accessToken);
      synced += pushResult.synced;
      failed += pushResult.failed;
      conflicts += pushResult.conflicts;

      // Pull remote changes
      const pullResult = await this.pullChanges(accessToken);
      synced += pullResult.synced;
      conflicts += pullResult.conflicts;

      return { success: true, synced, failed, conflicts };
    } catch (error) {
      console.error("[Sync] Error:", error);
      return { success: false, synced, failed, conflicts };
    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to backend
  private async pushChanges(accessToken: string): Promise<SyncResult> {
    const changes = await changeQueries.getPending();
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    // Group by table for efficient processing
    const grouped = this.groupByTable(changes);

    for (const [table, tableChanges] of Object.entries(grouped)) {
      for (const change of tableChanges) {
        try {
          await this.pushSingleChange(table, change, accessToken);
          synced++;
        } catch (error: any) {
          if (error.status === 409) {
            conflicts++;
          } else {
            failed++;
            console.error(
              `[Sync] Push failed for ${table}:${change.record_id}`,
              error
            );
          }
        }
      }
    }

    // Mark all as synced after successful push
    if (synced > 0) {
      await changeQueries.markAsSynced(changes.slice(0, synced));
    }

    return { success: true, synced, failed, conflicts };
  }

  private async pushSingleChange(
    table: string,
    change: ChangeRow,
    accessToken: string
  ): Promise<void> {
    if (table !== "mindmaps") return; // Only sync mindmaps for now

    if (change.operation === "DELETE") {
      await this.deleteOnBackend(change.record_id, accessToken);
    } else {
      await this.upsertOnBackend(change.record_id, accessToken);
    }
  }

  private async upsertOnBackend(
    id: string,
    accessToken: string
  ): Promise<void> {
    const fullMindmap = await mindmapQueries.getFull(id);
    if (!fullMindmap) return;

    const exists = await this.existsOnBackend(id, accessToken);
    const method = exists ? "PUT" : "POST";
    const url = exists
      ? `${API_BASE_URL}/api/mindmaps/${id}`
      : `${API_BASE_URL}/api/mindmaps`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: fullMindmap.mindMap.id,
        title: fullMindmap.mindMap.title,
        central_topic: fullMindmap.mindMap.central_topic,
        summary: fullMindmap.mindMap.summary,
        document_id: fullMindmap.mindMap.document_id,
        version: fullMindmap.mindMap.version,
        nodes: fullMindmap.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          keywords: n.keywords ? JSON.parse(n.keywords) : [],
          level: n.level,
          parent_id: n.parent_id,
          position: { x: n.position_x, y: n.position_y },
          notes: n.notes,
        })),
        connections: fullMindmap.connections.map((c) => ({
          id: c.id,
          from: c.from_node_id,
          to: c.to_node_id,
          relationship: c.relationship,
        })),
      }),
    });

    if (!response.ok) {
      const error: any = new Error("Push failed");
      error.status = response.status;
      throw error;
    }
  }

  private async deleteOnBackend(
    id: string,
    accessToken: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/mindmaps/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error("Delete failed");
    }
  }

  private async existsOnBackend(
    id: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mindmaps/${id}`, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Pull remote changes from backend
  private async pullChanges(accessToken: string): Promise<SyncResult> {
    let synced = 0;
    let conflicts = 0;

    try {
      const lastSync = await changeQueries.getLastSyncTimestamp();

      const response = await fetch(
        `${API_BASE_URL}/api/mindmaps?since=${lastSync}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error("Pull failed");

      const result = await response.json();
      const remoteMindmaps = result.data || [];

      for (const remote of remoteMindmaps) {
        const local = await mindmapQueries.get(remote.id);

        if (!local) {
          // New from backend, insert locally
          await this.insertFromRemote(remote);
          synced++;
        } else if (remote.version > local.version) {
          // Remote is newer, update local
          await this.updateFromRemote(remote);
          synced++;
        } else if (!local.is_synced && remote.version === local.version) {
          // Conflict: both modified
          conflicts++;
        }
      }

      await changeQueries.setLastSyncTimestamp(Date.now());
      return { success: true, synced, failed: 0, conflicts };
    } catch (error) {
      console.error("[Sync] Pull failed:", error);
      return { success: false, synced, failed: 1, conflicts };
    }
  }

  private async insertFromRemote(remote: any): Promise<void> {
    const db = await getDB();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO mindmaps (id, title, central_topic, summary, document_id, 
          created_at, updated_at, is_synced, last_synced_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          remote.id,
          remote.title,
          remote.central_topic,
          remote.summary,
          remote.document_id,
          remote.created_at || now,
          remote.updated_at || now,
          now,
          remote.version || 1,
        ]
      );

      // Insert nodes
      for (const node of remote.nodes || []) {
        await db.runAsync(
          `INSERT INTO mindmap_nodes (id, mindmap_id, label, keywords, level, parent_id, 
            position_x, position_y, notes, is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)`,
          [
            node.id,
            remote.id,
            node.label,
            JSON.stringify(node.keywords || []),
            node.level || 0,
            node.parent_id,
            node.position?.x || 0,
            node.position?.y || 0,
            node.notes,
            now,
          ]
        );
      }

      // Insert connections
      for (const conn of remote.connections || []) {
        await db.runAsync(
          `INSERT INTO connections (id, mindmap_id, from_node_id, to_node_id, relationship, 
            is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
          [conn.id, remote.id, conn.from, conn.to, conn.relationship, now]
        );
      }
    });
  }

  private async updateFromRemote(remote: any): Promise<void> {
    const db = await getDB();
    const now = Date.now();

    await db.runAsync(
      `UPDATE mindmaps SET title = ?, central_topic = ?, summary = ?, 
        updated_at = ?, is_synced = 1, last_synced_at = ?, version = ?
       WHERE id = ?`,
      [
        remote.title,
        remote.central_topic,
        remote.summary,
        remote.updated_at || now,
        now,
        remote.version,
        remote.id,
      ]
    );
  }

  // Helper methods
  private groupByTable(changes: ChangeRow[]): Record<string, ChangeRow[]> {
    return changes.reduce(
      (acc, c) => {
        (acc[c.table_name] ??= []).push(c);
        return acc;
      },
      {} as Record<string, ChangeRow[]>
    );
  }

  async getPendingChangesCount(): Promise<number> {
    return changeQueries.getCount();
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
