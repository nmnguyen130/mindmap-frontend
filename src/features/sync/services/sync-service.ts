import { API_BASE_URL } from "@/constants/config";
import type { ChangeRow, MindMapRow } from "@/database";
import { changeQueries, mindmapQueries } from "@/database";
import { getDB } from "@/database/client";
import type { ConflictItem } from "../store/sync-store";
import { useSyncStore } from "../store/sync-store";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
}

/**
 * SyncService handles bidirectional synchronization between local SQLite and backend.
 * - Push: sends local pending changes to the server
 * - Pull: fetches remote updates and merges into local database
 *
 * Note: Uses useSyncStore.isSyncing as single source of truth (no internal flag)
 */
class SyncService {
  /**
   * Main sync: push local, then pull remote
   */
  async sync(accessToken: string): Promise<SyncResult> {
    // Use store as single source of truth for sync state
    const { isSyncing } = useSyncStore.getState();
    if (isSyncing || !accessToken) {
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }

    let synced = 0;
    let failed = 0;
    let conflictItems: ConflictItem[] = [];

    try {
      // Push local changes
      const pushResult = await this.pushChanges(accessToken);
      synced += pushResult.synced;
      failed += pushResult.failed;
      conflictItems.push(...pushResult.conflicts);

      // Pull remote changes
      const pullResult = await this.pullChanges(accessToken);
      synced += pullResult.synced;
      conflictItems.push(...pullResult.conflicts);

      return { success: true, synced, failed, conflicts: conflictItems };
    } catch (error) {
      console.error("[Sync] Error:", error);
      return { success: false, synced, failed, conflicts: conflictItems };
    }
  }

  // Push local changes to backend
  private async pushChanges(accessToken: string): Promise<SyncResult> {
    const changes = await changeQueries.getPending();
    let synced = 0;
    let failed = 0;
    const conflictItems: ConflictItem[] = [];

    // Group by table for efficient processing
    const grouped = this.groupByTable(changes);
    const mindmapChanges = grouped["mindmaps"] || [];

    // Batch load all mindmaps that need syncing (optimization)
    const mindmapIdsToSync = mindmapChanges
      .filter((c) => c.operation !== "DELETE")
      .map((c) => c.record_id);
    const mindmapsToSync = await mindmapQueries.getByIds(mindmapIdsToSync);
    const mindmapMap = new Map(mindmapsToSync.map((m) => [m.mindMap.id, m]));

    // Process mindmap changes with pre-loaded data
    for (const change of mindmapChanges) {
      try {
        if (change.operation === "DELETE") {
          await this.deleteOnBackend(change.record_id, accessToken);
        } else {
          const fullMindmap = mindmapMap.get(change.record_id);
          if (fullMindmap) {
            await this.upsertOnBackend(fullMindmap, accessToken);
          }
        }
        synced++;
      } catch (error: any) {
        if (error.status === 409) {
          // Conflict detected during push - will be resolved during pull
        } else {
          failed++;
          console.error(
            `[Sync] Push failed for mindmaps:${change.record_id}`,
            error
          );
        }
      }
    }

    // Mark all as synced after successful push
    if (synced > 0) {
      await changeQueries.markAsSynced(mindmapChanges.slice(0, synced));
    }

    return { success: true, synced, failed, conflicts: conflictItems };
  }

  // PUT upsert - backend handles insert or update
  private async upsertOnBackend(
    fullMindmap: { mindMap: any; nodes: any[]; connections: any[] },
    accessToken: string
  ): Promise<void> {
    const id = fullMindmap.mindMap.id;

    const response = await fetch(`${API_BASE_URL}/api/mindmaps/${id}`, {
      method: "PUT",
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

  // Pull remote changes from backend
  private async pullChanges(accessToken: string): Promise<SyncResult> {
    let synced = 0;
    const conflictItems: ConflictItem[] = [];

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

      // Batch fetch all local mindmaps in one query (optimization)
      const remoteIds = remoteMindmaps.map((r: any) => r.id);
      const localMap = await mindmapQueries.getByLocalIds(remoteIds);

      for (const remote of remoteMindmaps) {
        const local = localMap.get(remote.id);

        if (!local) {
          // New from backend, insert locally
          await this.insertFromRemote(remote);
          synced++;
        } else if (remote.version > local.version) {
          // Remote is newer, update local (preserving unsynced changes)
          await this.updateFromRemote(remote);
          synced++;
        } else if (!local.is_synced && remote.version === local.version) {
          // Conflict: both local and remote modified
          conflictItems.push({
            id: remote.id,
            table: "mindmaps",
            localVersion: local.version,
            remoteVersion: remote.version,
            localTitle: local.title,
            remoteTitle: remote.title,
            localUpdatedAt: local.updated_at,
            remoteUpdatedAt: remote.updated_at,
          });
        }
      }

      await changeQueries.setLastSyncTimestamp(Date.now());
      return { success: true, synced, failed: 0, conflicts: conflictItems };
    } catch (error) {
      console.error("[Sync] Pull failed:", error);
      return { success: false, synced, failed: 1, conflicts: conflictItems };
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

  /**
   * Update local mindmap from remote data, preserving unsynced local changes.
   * - Only synced items (is_synced = 1) are replaced
   * - Unsynced items (is_synced = 0) are preserved for next push
   */
  private async updateFromRemote(remote: any): Promise<void> {
    const db = await getDB();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      // Update mindmap metadata
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

      // Get IDs of local unsynced items to PRESERVE
      const unsyncedNodes = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM mindmap_nodes WHERE mindmap_id = ? AND is_synced = 0`,
        [remote.id]
      );
      const unsyncedConns = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM connections WHERE mindmap_id = ? AND is_synced = 0`,
        [remote.id]
      );
      const preserveNodeIds = new Set(unsyncedNodes.map((n) => n.id));
      const preserveConnIds = new Set(unsyncedConns.map((c) => c.id));

      // Delete ONLY synced nodes (preserve unsynced local changes)
      await db.runAsync(
        `DELETE FROM mindmap_nodes WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );
      await db.runAsync(
        `DELETE FROM connections WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );

      // Upsert nodes from remote (skip if local unsynced version exists)
      for (const node of remote.nodes || []) {
        if (preserveNodeIds.has(node.id)) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO mindmap_nodes 
           (id, mindmap_id, label, keywords, level, parent_id, 
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

      // Upsert connections from remote (skip if local unsynced version exists)
      for (const conn of remote.connections || []) {
        if (preserveConnIds.has(conn.id)) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO connections 
           (id, mindmap_id, from_node_id, to_node_id, relationship, 
            is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
          [conn.id, remote.id, conn.from, conn.to, conn.relationship, now]
        );
      }
    });
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
}

export const syncService = new SyncService();
