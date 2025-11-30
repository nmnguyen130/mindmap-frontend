import { databaseService, ChangeRow, MindMapRow, MindMapNodeRow, ConnectionRow } from '@/shared/database/sqlite-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { API_BASE_URL } from '@/constants/config';

export interface SyncResult {
    success: boolean;
    synced: number;
failed: number;
conflicts: number;
}

export interface ConflictResolution {
    strategy: 'local' | 'remote' | 'merge';
    recordId: string;
    table: string;
}

class SyncService {
    private isSyncing = false;
    private syncQueue: Set<string> = new Set();
    private retryCount = new Map<string, number>();
    private maxRetries = 3;

    // ========================================================================
    // Core Sync Methods
    // ========================================================================

    /**
     * Main sync function - orchestrates push and pull operations
     */
    async sync(): Promise<SyncResult> {
        if (this.isSyncing) {
            console.log('Sync already in progress');
            return { success: false, synced: 0, failed: 0, conflicts: 0 };
        }

        this.isSyncing = true;
        let synced = 0;
        let failed = 0;
        let conflicts = 0;

        try {
            // Step 1: Push local changes to backend
            const pushResult = await this.pushChanges();
            synced += pushResult.synced;
            failed += pushResult.failed;
            conflicts += pushResult.conflicts;

            // Step 2: Pull remote changes from backend
            const pullResult = await this.pullChanges();
            synced += pullResult.synced;
            conflicts += pullResult.conflicts;

            return { success: true, synced, failed, conflicts };
        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, synced, failed, conflicts };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Push local changes to backend
     */
    private async pushChanges(): Promise<SyncResult> {
        const changes = await databaseService.getPendingChanges();
        let synced = 0;
        let failed = 0;
        let conflicts = 0;

        // Group changes by table for efficient batch processing
        const groupedChanges = this.groupChangesByTable(changes);

        for (const [table, tableChanges] of Object.entries(groupedChanges)) {
            for (const change of tableChanges) {
                try {
                    await this.syncChange(table, change);
                    synced++;

                    // Mark as synced in local DB
                    await databaseService.markAsSynced([change]);
                } catch (error: any) {
                    if (error.status === 409) {
                        // Conflict detected
                        conflicts++;
                        await this.handleConflict(table, change, error);
                    } else {
                        failed++;
                        this.handleSyncError(change, error);
                    }
                }
            }
        }

        return { success: true, synced, failed, conflicts };
    }

    /**
     * Pull changes from backend since last sync
     */
    private async pullChanges(): Promise<SyncResult> {
        let synced = 0;
        let conflicts = 0;

        try {
            const accessToken = useAuthStore.getState().accessToken;
            if (!accessToken) throw new Error('Not authenticated');

            // Get last sync timestamp
            const lastSyncTimestamp = await this.getLastSyncTimestamp();

            // Fetch mindmaps from backend
            const response = await fetch(
                `${API_BASE_URL}/api/mindmaps?since=${lastSyncTimestamp}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch mindmaps');

            const result = await response.json();
            const remoteMindmaps = result.data || [];

            // Process each remote mindmap
            for (const remoteMindmap of remoteMindmaps) {
                const localMindmap = await databaseService.getMindMap(remoteMindmap.id);

                if (!localMindmap) {
                    // New mindmap from backend - insert locally
                    await this.insertRemoteMindmap(remoteMindmap);
                    synced++;
                } else {
                    // Check for conflicts
                    const conflict = this.detectConflict(localMindmap, remoteMindmap);

                    if (conflict) {
                        conflicts++;
                        await this.resolveConflict(localMindmap, remoteMindmap);
                    } else if (new Date(remoteMindmap.updated_at) > new Date(localMindmap.updated_at)) {
                        // Remote is newer - update local
                        await this.updateLocalMindmap(remoteMindmap);
                        synced++;
                    }
                }
            }

            // Update last sync timestamp
            await this.updateLastSyncTimestamp();

            return { success: true, synced, failed: 0, conflicts };
        } catch (error) {
            console.error('Pull changes failed:', error);
            return { success: false, synced, failed: 1, conflicts };
        }
    }

    // ========================================================================
    // API Integration Methods
    // ========================================================================

    private async syncChange(table: string, change: ChangeRow): Promise<void> {
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) throw new Error('Not authenticated');

        switch (table) {
            case 'mindmaps':
                await this.syncMindmap(change, accessToken);
                break;
            case 'mindmap_nodes':
                await this.syncNode(change, accessToken);
                break;
            case 'connections':
                await this.syncConnection(change, accessToken);
                break;
        }
    }

    private async syncMindmap(change: ChangeRow, accessToken: string): Promise<void> {
        const mindmap = await databaseService.getMindMap(change.record_id);

        if (change.operation === 'DELETE' || (mindmap && mindmap.deleted_at)) {
            // Delete operation
            const response = await fetch(`${API_BASE_URL}/api/mindmaps/${change.record_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!response.ok && response.status !== 404) {
                throw new Error('Delete failed');
            }
            return;
        }

        if (!mindmap) return;

        // Check if this mindmap exists on backend
        const exists = await this.mindmapExistsOnBackend(mindmap.id, accessToken);
        const method = exists ? 'PUT' : 'POST';
        const endpoint = exists
            ? `${API_BASE_URL}/api/mindmaps/${mindmap.id}`
            : `${API_BASE_URL}/api/mindmaps`;

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                id: mindmap.id,
                title: mindmap.title,
                central_topic: mindmap.central_topic,
                summary: mindmap.summary,
                document_id: mindmap.document_id,
                version: mindmap.version,
                updated_at: mindmap.updated_at,
            }),
        });

        if (!response.ok) {
            const error: any = new Error('Sync failed');
            error.status = response.status;

            if (response.status === 409) {
                const result = await response.json();
                error.remoteData = result.remoteData;
            }

            throw error;
        }
    }

    private async syncNode(change: ChangeRow, accessToken: string): Promise<void> {
        const nodes = await databaseService.getNodesForMindMap(change.record_id);
        const node = nodes.find(n => n.id === change.record_id);

        if (change.operation === 'DELETE' || (node && node.deleted_at)) {
            // Delete operation - handled by cascade from mindmap
            return;
        }

        if (!node) return;

        // Nodes are synced as part of the mindmap
        // Individual node updates trigger mindmap version increment
    }

    private async syncConnection(change: ChangeRow, accessToken: string): Promise<void> {
        const connections = await databaseService.getConnectionsForMindMap(change.record_id);
        const connection = connections.find(c => c.id === change.record_id);

        if (change.operation === 'DELETE' || (connection && connection.deleted_at)) {
            // Delete operation - handled by cascade from mindmap
            return;
        }

        if (!connection) return;

        // Connections are synced as part of the mindmap
    }

    // ========================================================================
    // Conflict Resolution Methods
    // ========================================================================

    private detectConflict(local: MindMapRow, remote: any): boolean {
        // Conflict if both have been modified since last sync
        return (
            local.is_synced === 0 &&
            local.version !== remote.version &&
            new Date(local.updated_at) > new Date(local.last_synced_at || 0)
        );
    }

    private async handleConflict(table: string, change: ChangeRow, error: any): Promise<void> {
        // Default strategy: Last Write Wins (LWW)
        console.warn(`Conflict detected for ${table}:${change.record_id}`);

        // For now, prefer remote version
        const remoteData = error.remoteData;

        if (remoteData) {
            await this.applyRemoteChanges(table, remoteData);
        }
    }

    private async resolveConflict(local: MindMapRow, remote: any): Promise<void> {
        // Strategy: Last Write Wins
        if (new Date(remote.updated_at) > new Date(local.updated_at)) {
            await this.updateLocalMindmap(remote);
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    private groupChangesByTable(changes: ChangeRow[]): Record<string, ChangeRow[]> {
        return changes.reduce((acc, change) => {
            if (!acc[change.table_name]) {
                acc[change.table_name] = [];
            }
            acc[change.table_name].push(change);
            return acc;
        }, {} as Record<string, ChangeRow[]>);
    }

    private async mindmapExistsOnBackend(id: string, accessToken: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/mindmaps/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private async insertRemoteMindmap(remoteMindmap: any): Promise<void> {
        const db = await databaseService.initialize();

        await db.withTransactionAsync(async () => {
            // Insert mindmap
            await db.runAsync(
                `INSERT OR REPLACE INTO mindmaps 
        (id, title, central_topic, summary, document_id, created_at, updated_at, 
         is_synced, last_synced_at, version, deleted_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, NULL)`,
                [
                    remoteMindmap.id,
                    remoteMindmap.title,
                    remoteMindmap.central_topic,
                    remoteMindmap.summary,
                    remoteMindmap.document_id,
                    remoteMindmap.created_at,
                    remoteMindmap.updated_at,
                    remoteMindmap.version || 1,
                ]
            );

            // Insert nodes if provided
            if (remoteMindmap.nodes) {
                for (const node of remoteMindmap.nodes) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO mindmap_nodes 
            (id, mindmap_id, label, keywords, level, parent_id, position_x, position_y, 
             notes, created_at, updated_at, is_synced, last_synced_at, version, deleted_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, NULL)`,
                        [
                            node.id,
                            remoteMindmap.id,
                            node.label,
                            JSON.stringify(node.keywords || []),
                            node.level || 0,
                            node.parent_id,
                            node.position?.x || 0,
                            node.position?.y || 0,
                            node.notes,
                            node.created_at || remoteMindmap.created_at,
                            node.updated_at || remoteMindmap.updated_at,
                            node.version || 1,
                        ]
                    );
                }
            }

            // Insert connections if provided
            if (remoteMindmap.connections) {
                for (const conn of remoteMindmap.connections) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO connections 
            (id, mindmap_id, from_node_id, to_node_id, relationship, created_at, updated_at, 
             is_synced, last_synced_at, version, deleted_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, NULL)`,
                        [
                            conn.id,
                            remoteMindmap.id,
                            conn.from_node_id,
                            conn.to_node_id,
                            conn.relationship,
                            conn.created_at || remoteMindmap.created_at,
                            conn.updated_at || remoteMindmap.updated_at,
                            conn.version || 1,
                        ]
                    );
                }
            }
        });
    }

    private async updateLocalMindmap(remoteMindmap: any): Promise<void> {
        const db = await databaseService.initialize();

        await db.runAsync(
            `UPDATE mindmaps 
       SET title = ?, central_topic = ?, summary = ?, document_id = ?, 
           updated_at = ?, is_synced = 1, last_synced_at = CURRENT_TIMESTAMP, 
           version = ? 
       WHERE id = ?`,
            [
                remoteMindmap.title,
                remoteMindmap.central_topic,
                remoteMindmap.summary,
                remoteMindmap.document_id,
                remoteMindmap.updated_at,
                remoteMindmap.version || 1,
                remoteMindmap.id,
            ]
        );
    }

    private async applyRemoteChanges(table: string, remoteData: any): Promise<void> {
        // Apply remote changes to local database
        if (table === 'mindmaps') {
            await this.updateLocalMindmap(remoteData);
        }
    }

    private handleSyncError(change: ChangeRow, error: any): void {
        const key = `${change.table_name}:${change.record_id}`;
        const retries = this.retryCount.get(key) || 0;

        if (retries < this.maxRetries) {
            this.retryCount.set(key, retries + 1);
            this.syncQueue.add(key);
            console.log(`Retry ${retries + 1}/${this.maxRetries} for ${key}`);
        } else {
            console.error(`Max retries exceeded for ${key}`, error);
            this.retryCount.delete(key);
        }
    }

    private async getLastSyncTimestamp(): Promise<string> {
        const db = await databaseService.initialize();
        const result = await db.getFirstAsync<{ value: string }>(
            "SELECT value FROM settings WHERE key = 'last_sync_timestamp'"
        );
        return result?.value || new Date(0).toISOString();
    }

    private async updateLastSyncTimestamp(): Promise<void> {
        const db = await databaseService.initialize();
        const timestamp = new Date().toISOString();
        await db.runAsync(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ['last_sync_timestamp', timestamp]
        );
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Manually trigger a sync
     */
    async syncNow(): Promise<SyncResult> {
        return await this.sync();
    }

    /**
     * Check if sync is in progress
     */
    isSyncInProgress(): boolean {
        return this.isSyncing;
    }

    /**
     * Get pending changes count
     */
    async getPendingChangesCount(): Promise<number> {
        const changes = await databaseService.getPendingChanges();
        return changes.length;
    }
}

export const syncService = new SyncService();
