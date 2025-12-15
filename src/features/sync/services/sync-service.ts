import type { ChangeRow, FullMindMap } from "@/database";
import { changeQueries, mindmapQueries } from "@/database";
import { getDB } from "@/database/client";
import { fetchWithAuth } from "@/features/auth";

import type { ConflictItem } from "../store/sync-store";
import type { SQLiteDatabase } from "expo-sqlite";

// TYPES
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
}

/** Remote mindmap response - aligned with backend schema */
interface RemoteMindmap {
  id: string;
  title: string;
  central_topic: string | null;
  summary: string | null;
  document_id: string | null;
  version: number;
  created_at: number;
  updated_at: number;
  nodes?: RemoteNode[];
  connections?: RemoteConnection[];
}

interface RemoteNode {
  id: string;
  label: string;
  keywords: string | null;
  level: number;
  parent_id: string | null;
  position_x: number;
  position_y: number;
  notes: string | null;
  version: number;
}

interface RemoteConnection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship: string | null;
  version: number;
}

/**
 * SyncService handles bidirectional sync between local SQLite and backend.
 * Uses fetchWithAuth for automatic 401 retry with mutex-protected token refresh.
 */
class SyncService {
  /**
   * Main sync: push local, then pull remote.
   */
  async sync(): Promise<SyncResult> {
    let synced = 0;
    let failed = 0;
    const conflictItems: ConflictItem[] = [];

    try {
      const pushResult = await this.pushChanges();
      synced += pushResult.synced;
      failed += pushResult.failed;
      conflictItems.push(...pushResult.conflicts);

      const pullResult = await this.pullChanges();
      synced += pullResult.synced;
      conflictItems.push(...pullResult.conflicts);

      return { success: true, synced, failed, conflicts: conflictItems };
    } catch (error) {
      console.error("[Sync] Error:", error);
      return { success: false, synced, failed, conflicts: conflictItems };
    }
  }

  async getPendingChangesCount(): Promise<number> {
    return changeQueries.getCount();
  }

  // PUSH: Local → Backend
  private async pushChanges(): Promise<SyncResult> {
    const changes = await changeQueries.getPending();
    let synced = 0;
    let failed = 0;
    const conflictItems: ConflictItem[] = [];
    const syncedChanges: ChangeRow[] = [];

    const grouped = this.groupByTable(changes);
    const mindmapChanges = grouped["mindmaps"] || [];
    const nodeChanges = grouped["mindmap_nodes"] || [];
    const connectionChanges = grouped["connections"] || [];

    // Batch fetch mindmaps to sync
    const mindmapIdsToSync = mindmapChanges
      .filter((c) => c.operation !== "DELETE")
      .map((c) => c.record_id);
    const mindmapsToSync = await mindmapQueries.getByIds(mindmapIdsToSync);
    const mindmapMap = new Map(mindmapsToSync.map((m) => [m.mindMap.id, m]));

    // Build lookup maps for O(1) node/connection → mindmap resolution
    const nodeToMindmap = new Map<string, string>();
    const connToMindmap = new Map<string, string>();
    for (const m of mindmapsToSync) {
      for (const n of m.nodes) nodeToMindmap.set(n.id, m.mindMap.id);
      for (const c of m.connections) connToMindmap.set(c.id, m.mindMap.id);
    }

    for (const change of mindmapChanges) {
      try {
        if (change.operation === "DELETE") {
          await this.deleteOnBackend(change.record_id);
        } else {
          const fullMindmap = mindmapMap.get(change.record_id);
          if (fullMindmap) {
            await this.upsertOnBackend(fullMindmap);
          }
        }
        synced++;
        syncedChanges.push(change);

        // Mark all related node/connection changes as synced
        const mindmapId = change.record_id;
        syncedChanges.push(
          ...nodeChanges.filter(
            (c) => nodeToMindmap.get(c.record_id) === mindmapId
          ),
          ...connectionChanges.filter(
            (c) => connToMindmap.get(c.record_id) === mindmapId
          )
        );
      } catch (error) {
        const err = error as { status?: number };
        if (err.status !== 409) {
          failed++;
          console.error(
            `[Sync] Push failed for mindmaps:${change.record_id}`,
            error
          );
        }
        // 409 = conflict, will be resolved during pull
      }
    }

    // Mark remaining node/connection changes as synced (they're included in mindmap sync)
    for (const change of [...nodeChanges, ...connectionChanges]) {
      if (!syncedChanges.includes(change)) {
        syncedChanges.push(change);
      }
    }

    if (syncedChanges.length > 0) {
      await changeQueries.markAsSynced(syncedChanges);
    }

    return { success: true, synced, failed, conflicts: conflictItems };
  }

  /**
   * Push mindmap to backend via PUT (backend handles create-if-not-exists)
   */
  private async upsertOnBackend(fullMindmap: FullMindMap): Promise<void> {
    const payload = {
      id: fullMindmap.mindMap.id,
      title: fullMindmap.mindMap.title,
      central_topic: fullMindmap.mindMap.central_topic ?? null,
      summary: fullMindmap.mindMap.summary ?? null,
      document_id: fullMindmap.mindMap.document_id ?? null,
      version: fullMindmap.mindMap.version,
      nodes: fullMindmap.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        keywords: n.keywords,
        level: n.level,
        parent_id: n.parent_id ?? null,
        position_x: n.position_x,
        position_y: n.position_y,
        notes: n.notes ?? null,
        version: n.version,
      })),
      connections: fullMindmap.connections.map((c) => ({
        id: c.id,
        from_node_id: c.from_node_id,
        to_node_id: c.to_node_id,
        relationship: c.relationship ?? null,
        version: c.version,
      })),
    };

    // PUT only - backend updateMindmap handles create-if-not-exists
    const result = await fetchWithAuth(
      `/api/mindmaps/${fullMindmap.mindMap.id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    if (result.error) {
      const error = new Error(result.error) as Error & { status: number };
      error.status = result.status;
      throw error;
    }
  }

  private async deleteOnBackend(id: string): Promise<void> {
    const result = await fetchWithAuth(`/api/mindmaps/${id}`, {
      method: "DELETE",
    });
    if (result.error && result.status !== 404) {
      throw new Error(result.error);
    }
  }

  // PULL: Backend → Local
  private async pullChanges(): Promise<SyncResult> {
    let synced = 0;
    const conflictItems: ConflictItem[] = [];

    try {
      const lastSync = await changeQueries.getLastSyncTimestamp();
      const result = await fetchWithAuth<RemoteMindmap[]>(
        `/api/mindmaps?since=${lastSync}`
      );

      if (result.error) throw new Error(result.error);

      const remoteMindmaps = result.data || [];
      const remoteIds = remoteMindmaps.map((r) => r.id);
      const localMap = await mindmapQueries.getByLocalIds(remoteIds);

      for (const remote of remoteMindmaps) {
        const local = localMap.get(remote.id);

        if (!local) {
          await this.insertFromRemote(remote);
          synced++;
        } else if (remote.version > local.version) {
          await this.updateFromRemote(remote);
          synced++;
        } else if (!local.is_synced && remote.version === local.version) {
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

  private async insertFromRemote(remote: RemoteMindmap): Promise<void> {
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
          remote.central_topic ?? "",
          remote.summary ?? "",
          remote.document_id ?? null,
          remote.created_at ?? now,
          remote.updated_at ?? now,
          now,
          remote.version ?? 1,
        ]
      );

      await this.insertNodesFromRemote(db, remote.id, remote.nodes ?? [], now);
      await this.insertConnectionsFromRemote(
        db,
        remote.id,
        remote.connections ?? [],
        now
      );
    });
  }

  private async updateFromRemote(remote: RemoteMindmap): Promise<void> {
    const db = await getDB();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE mindmaps SET title = ?, central_topic = ?, summary = ?, 
          updated_at = ?, is_synced = 1, last_synced_at = ?, version = ?
         WHERE id = ?`,
        [
          remote.title,
          remote.central_topic ?? "",
          remote.summary ?? "",
          remote.updated_at ?? now,
          now,
          remote.version,
          remote.id,
        ]
      );

      // Preserve unsynced local changes
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

      // Delete synced items, then insert remote data
      await db.runAsync(
        `DELETE FROM mindmap_nodes WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );
      await db.runAsync(
        `DELETE FROM connections WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );

      await this.insertNodesFromRemote(
        db,
        remote.id,
        remote.nodes ?? [],
        now,
        preserveNodeIds
      );
      await this.insertConnectionsFromRemote(
        db,
        remote.id,
        remote.connections ?? [],
        now,
        preserveConnIds
      );
    });
  }

  // HELPER FUNCTIONS (DRY)

  /**
   * Insert nodes from remote data, optionally preserving specific IDs
   */
  private async insertNodesFromRemote(
    db: SQLiteDatabase,
    mindmapId: string,
    nodes: RemoteNode[],
    now: number,
    preserveIds?: Set<string>
  ): Promise<void> {
    for (const node of nodes) {
      if (preserveIds?.has(node.id)) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO mindmap_nodes 
         (id, mindmap_id, label, keywords, level, parent_id, 
          position_x, position_y, notes, is_synced, last_synced_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          node.id,
          mindmapId,
          node.label,
          node.keywords ?? null,
          node.level,
          node.parent_id ?? null,
          node.position_x,
          node.position_y,
          node.notes ?? null,
          now,
          node.version ?? 1,
        ]
      );
    }
  }

  /**
   * Insert connections from remote data, optionally preserving specific IDs
   */
  private async insertConnectionsFromRemote(
    db: SQLiteDatabase,
    mindmapId: string,
    connections: RemoteConnection[],
    now: number,
    preserveIds?: Set<string>
  ): Promise<void> {
    for (const conn of connections) {
      if (preserveIds?.has(conn.id)) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO connections 
         (id, mindmap_id, from_node_id, to_node_id, relationship, 
          is_synced, last_synced_at, version)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          conn.id,
          mindmapId,
          conn.from_node_id,
          conn.to_node_id,
          conn.relationship ?? null,
          now,
          conn.version ?? 1,
        ]
      );
    }
  }

  private groupByTable(changes: ChangeRow[]): Record<string, ChangeRow[]> {
    return changes.reduce(
      (acc, c) => {
        (acc[c.table_name] ??= []).push(c);
        return acc;
      },
      {} as Record<string, ChangeRow[]>
    );
  }
}

export const syncService = new SyncService();
