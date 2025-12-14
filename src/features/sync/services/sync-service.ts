import type { ChangeRow, FullMindMap } from "@/database";
import { changeQueries, mindmapQueries } from "@/database";
import { getDB } from "@/database/client";
import { fetchWithAuth } from "@/features/auth";

import type { ConflictItem } from "../store/sync-store";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
}

interface RemoteMindmap {
  id: string;
  title: string;
  central_topic?: string;
  summary?: string;
  document_id?: string;
  version: number;
  created_at?: number;
  updated_at?: number;
  nodes?: {
    id: string;
    label: string;
    keywords?: string[];
    level?: number;
    parent_id?: string;
    position?: { x: number; y: number };
    notes?: string;
  }[];
  connections?: {
    id: string;
    from: string;
    to: string;
    relationship?: string;
  }[];
}

/**
 * SyncService handles bidirectional sync between local SQLite and backend.
 * Uses fetchWithAuth for automatic 401 retry with mutex-protected token refresh.
 */
class SyncService {
  /**
   * Main sync: push local, then pull remote.
   * Token is fetched from store by fetchWithAuth on each request.
   *
   * Note: Callers (SyncController, SyncStatusIndicator) are responsible for
   * managing the isSyncing state to prevent concurrent calls.
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

  private async pushChanges(): Promise<SyncResult> {
    const changes = await changeQueries.getPending();
    let synced = 0;
    let failed = 0;
    const conflictItems: ConflictItem[] = [];

    const grouped = this.groupByTable(changes);
    const mindmapChanges = grouped["mindmaps"] || [];

    const mindmapIdsToSync = mindmapChanges
      .filter((c) => c.operation !== "DELETE")
      .map((c) => c.record_id);
    const mindmapsToSync = await mindmapQueries.getByIds(mindmapIdsToSync);
    const mindmapMap = new Map(mindmapsToSync.map((m) => [m.mindMap.id, m]));

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
      } catch (error) {
        const err = error as { status?: number };
        if (err.status === 409) {
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

    if (synced > 0) {
      await changeQueries.markAsSynced(mindmapChanges.slice(0, synced));
    }

    return { success: true, synced, failed, conflicts: conflictItems };
  }

  private async upsertOnBackend(fullMindmap: FullMindMap): Promise<void> {
    const id = fullMindmap.mindMap.id;
    const payload = {
      id: fullMindmap.mindMap.id,
      title: fullMindmap.mindMap.title,
      central_topic: fullMindmap.mindMap.central_topic ?? "",
      summary: fullMindmap.mindMap.summary ?? "",
      document_id: fullMindmap.mindMap.document_id ?? null,
      version: fullMindmap.mindMap.version,
      nodes: fullMindmap.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        keywords: n.keywords ? (JSON.parse(n.keywords) as string[]) : [],
        level: n.level,
        parent_id: n.parent_id ?? null,
        position: { x: n.position_x, y: n.position_y },
        notes: n.notes ?? null,
      })),
      connections: fullMindmap.connections.map((c) => ({
        id: c.id,
        from: c.from_node_id,
        to: c.to_node_id,
        relationship: c.relationship ?? null,
      })),
    };

    const result = await fetchWithAuth(`/api/mindmaps/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

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

  private async pullChanges(): Promise<SyncResult> {
    let synced = 0;
    const conflictItems: ConflictItem[] = [];

    try {
      const lastSync = await changeQueries.getLastSyncTimestamp();

      const result = await fetchWithAuth<RemoteMindmap[]>(
        `/api/mindmaps?since=${lastSync}`
      );

      if (result.error) {
        throw new Error(result.error);
      }

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
            remoteUpdatedAt: remote.updated_at ?? 0,
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

      for (const node of remote.nodes ?? []) {
        await db.runAsync(
          `INSERT INTO mindmap_nodes (id, mindmap_id, label, keywords, level, parent_id, 
            position_x, position_y, notes, is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)`,
          [
            node.id,
            remote.id,
            node.label,
            JSON.stringify(node.keywords ?? []),
            node.level ?? 0,
            node.parent_id ?? null,
            node.position?.x ?? 0,
            node.position?.y ?? 0,
            node.notes ?? null,
            now,
          ]
        );
      }

      for (const conn of remote.connections ?? []) {
        await db.runAsync(
          `INSERT INTO connections (id, mindmap_id, from_node_id, to_node_id, relationship, 
            is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
          [
            conn.id,
            remote.id,
            conn.from,
            conn.to,
            conn.relationship ?? null,
            now,
          ]
        );
      }
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

      await db.runAsync(
        `DELETE FROM mindmap_nodes WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );
      await db.runAsync(
        `DELETE FROM connections WHERE mindmap_id = ? AND is_synced = 1`,
        [remote.id]
      );

      for (const node of remote.nodes ?? []) {
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
            JSON.stringify(node.keywords ?? []),
            node.level ?? 0,
            node.parent_id ?? null,
            node.position?.x ?? 0,
            node.position?.y ?? 0,
            node.notes ?? null,
            now,
          ]
        );
      }

      for (const conn of remote.connections ?? []) {
        if (preserveConnIds.has(conn.id)) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO connections 
           (id, mindmap_id, from_node_id, to_node_id, relationship, 
            is_synced, last_synced_at, version)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
          [
            conn.id,
            remote.id,
            conn.from,
            conn.to,
            conn.relationship ?? null,
            now,
          ]
        );
      }
    });
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

  async getPendingChangesCount(): Promise<number> {
    return changeQueries.getCount();
  }
}

export const syncService = new SyncService();
