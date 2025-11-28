import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { databaseService } from "@/services/database";
import { calculateRadialLayout } from "@/utils/mindmap-layout";
import {
    generateId,
    dbRowToMindMap,
    storeNodeToDbNode,
    storeEdgeToDbConnection,
    type MindMapNode,
    type MindMapEdge,
    type MindmapData,
    type MindMap,
} from "./helpers/mindmap";

// ============================================================================
// Store State Interface
// ============================================================================

interface MindMapState {
    // Core data - using Map for O(1) lookups
    maps: Map<string, MindMap>;
    currentMapId: string | null;

    // UI state
    isLoading: boolean;
    error: string | null;

    // Sync state
    pendingSyncCount: number;
    lastSyncAt: Date | null;

    // Computed getters
    getCurrentMap: () => MindMap | null;
    getMapsList: () => MindMap[];

    // Load operations
    loadMaps: () => Promise<void>;
    loadMap: (id: string) => Promise<void>;
    refreshMap: (id: string) => Promise<void>;

    // Create/Delete operations
    createMap: (data: MindmapData) => Promise<MindMap>;
    createFromPdf: (id: string, title: string, data: MindmapData) => Promise<void>;
    deleteMap: (id: string) => Promise<void>;

    // Update operations - metadata
    updateMapMetadata: (
        id: string,
        metadata: Partial<Pick<MindMap, "title" | "central_topic" | "summary">>
    ) => Promise<void>;

    // Update operations - nodes
    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => Promise<void>;
    updateNodePositions: (updates: Array<{ nodeId: string; position: { x: number; y: number } }>) => Promise<void>;
    updateNodeNotes: (nodeId: string, notes: string | null) => Promise<void>;
    updateNode: (nodeId: string, updates: Partial<MindMapNode>) => Promise<void>;

    // Node/Edge CRUD operations
    addNode: (mapId: string, node: Omit<MindMapNode, "id">) => Promise<string>;
    deleteNode: (nodeId: string) => Promise<void>;
    addEdge: (mapId: string, edge: Omit<MindMapEdge, "id">) => Promise<string>;
    deleteEdge: (edgeId: string) => Promise<void>;

    // Layout operations
    autoLayoutMap: (id: string) => Promise<void>;

    // Sync operations
    getSyncStatus: () => Promise<{ pendingChanges: number }>;

    // UI helpers
    setCurrentMap: (mapId: string | null) => void;
    clearError: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMindMapStore = create<MindMapState>()(
    devtools(
        immer((set, get) => ({
            // Initial state
            maps: new Map(),
            currentMapId: null,
            isLoading: false,
            error: null,
            pendingSyncCount: 0,
            lastSyncAt: null,

            // ========================================================================
            // Computed Getters
            // ========================================================================

            getCurrentMap: () => {
                const { maps, currentMapId } = get();
                return currentMapId ? maps.get(currentMapId) ?? null : null;
            },

            getMapsList: () => {
                const { maps } = get();
                return Array.from(maps.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            },

            // ========================================================================
            // Load Operations
            // ========================================================================

            loadMaps: async () => {
                set({ isLoading: true, error: null });
                try {
                    const mindMapRows = await databaseService.getAllMindMaps();
                    const loadedMaps = new Map<string, MindMap>();

                    // Load full data for each mindmap
                    for (const row of mindMapRows) {
                        const fullMindMap = await databaseService.getFullMindMap(row.id);
                        if (fullMindMap) {
                            const map = dbRowToMindMap(fullMindMap.mindMap, fullMindMap.nodes, fullMindMap.connections);
                            loadedMaps.set(map.id, map);
                        }
                    }

                    set({ maps: loadedMaps, isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            loadMap: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    const fullMindMap = await databaseService.getFullMindMap(id);
                    if (!fullMindMap) {
                        throw new Error("Mind map not found");
                    }

                    const map = dbRowToMindMap(fullMindMap.mindMap, fullMindMap.nodes, fullMindMap.connections);

                    set((state) => {
                        state.maps.set(id, map);
                        state.currentMapId = id;
                        state.isLoading = false;
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            refreshMap: async (id: string) => {
                try {
                    const fullMindMap = await databaseService.getFullMindMap(id);
                    if (!fullMindMap) {
                        throw new Error("Mind map not found");
                    }

                    const map = dbRowToMindMap(fullMindMap.mindMap, fullMindMap.nodes, fullMindMap.connections);

                    set((state) => {
                        state.maps.set(id, map);
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            // ========================================================================
            // Create/Delete Operations
            // ========================================================================

            createMap: async (data: MindmapData) => {
                set({ isLoading: true, error: null });
                try {
                    const id = generateId();

                    // Apply auto layout if positions are missing
                    const needsLayout = data.nodes.some((n) => !n.position);
                    const nodesToSave = needsLayout ? calculateRadialLayout(data.nodes, data.edges) : data.nodes;

                    // Generate edge IDs if missing
                    const edgesToSave = data.edges.map((edge) => ({
                        ...edge,
                        id: (edge as any).id || generateId(),
                    }));

                    // Save to database
                    const db = await databaseService.initialize();
                    await db.withTransactionAsync(async () => {
                        // Create mindmap
                        await databaseService.createMindMap({
                            id,
                            title: data.title,
                            central_topic: data.central_topic,
                            summary: data.summary,
                        });

                        // Create nodes
                        for (const node of nodesToSave) {
                            const nodeWithId = { ...node, id: node.id || generateId() };
                            await databaseService.createNode(storeNodeToDbNode(nodeWithId, id));
                        }

                        // Create edges
                        for (const edge of edgesToSave) {
                            await databaseService.createConnection(storeEdgeToDbConnection(edge, id));
                        }
                    });

                    // Create map object
                    const newMap: MindMap = {
                        id,
                        title: data.title,
                        central_topic: data.central_topic,
                        summary: data.summary,
                        nodes: nodesToSave,
                        edges: edgesToSave,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isSynced: false,
                        lastSyncedAt: null,
                        version: 1,
                    };

                    set((state) => {
                        state.maps.set(id, newMap);
                        state.currentMapId = id;
                        state.isLoading = false;
                    });

                    return newMap;
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            createFromPdf: async (id: string, title: string, data: MindmapData) => {
                set({ isLoading: true, error: null });
                try {
                    // Apply auto layout
                    const layoutedNodes = calculateRadialLayout(data.nodes, data.edges);

                    // Generate edge IDs
                    const edgesToSave = data.edges.map((edge) => ({
                        ...edge,
                        id: (edge as any).id || generateId(),
                    }));

                    // Save to database
                    const db = await databaseService.initialize();
                    await db.withTransactionAsync(async () => {
                        await databaseService.createMindMap({
                            id,
                            title,
                            central_topic: data.central_topic,
                            summary: data.summary,
                        });

                        for (const node of layoutedNodes) {
                            await databaseService.createNode(storeNodeToDbNode(node, id));
                        }

                        for (const edge of edgesToSave) {
                            await databaseService.createConnection(storeEdgeToDbConnection(edge, id));
                        }
                    });

                    const newMap: MindMap = {
                        id,
                        title,
                        central_topic: data.central_topic,
                        summary: data.summary,
                        nodes: layoutedNodes,
                        edges: edgesToSave,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isSynced: false,
                        lastSyncedAt: null,
                        version: 1,
                    };

                    set((state) => {
                        state.maps.set(id, newMap);
                        state.currentMapId = id;
                        state.isLoading = false;
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            deleteMap: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    await databaseService.deleteMindMap(id);

                    set((state) => {
                        state.maps.delete(id);
                        if (state.currentMapId === id) {
                            state.currentMapId = null;
                        }
                        state.isLoading = false;
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            // ========================================================================
            // Update Operations - Metadata
            // ========================================================================

            updateMapMetadata: async (id, metadata) => {
                const previousMap = get().maps.get(id);
                if (!previousMap) {
                    throw new Error("Mind map not found");
                }

                // Optimistic update
                set((state) => {
                    const map = state.maps.get(id);
                    if (map) {
                        Object.assign(map, metadata);
                        map.updatedAt = new Date();
                    }
                });

                try {
                    await databaseService.updateMindMap(id, metadata);
                } catch (err) {
                    // Rollback
                    set((state) => {
                        state.maps.set(id, previousMap);
                    });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            // ========================================================================
            // Update Operations - Nodes
            // ========================================================================

            updateNodePosition: async (nodeId, position) => {
                // Save previous state for rollback
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        const node = map.nodes.find((n) => n.id === nodeId);
                        if (node) {
                            node.position = position;
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    await databaseService.updateNode(nodeId, {
                        position_x: position.x,
                        position_y: position.y,
                    });
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            updateNodePositions: async (updates) => {
                // Save previous state for rollback
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        updates.forEach(({ nodeId, position }) => {
                            const node = map.nodes.find((n) => n.id === nodeId);
                            if (node) {
                                node.position = position;
                            }
                        });
                        // Check if any node in this map was updated
                        if (updates.some(({ nodeId }) => map.nodes.find((n) => n.id === nodeId))) {
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    const db = await databaseService.initialize();
                    await db.withTransactionAsync(async () => {
                        for (const { nodeId, position } of updates) {
                            await databaseService.updateNode(nodeId, {
                                position_x: position.x,
                                position_y: position.y,
                            });
                        }
                    });
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            updateNodeNotes: async (nodeId, notes) => {
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        const node = map.nodes.find((n) => n.id === nodeId);
                        if (node) {
                            node.notes = notes;
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    await databaseService.updateNode(nodeId, { notes });
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            updateNode: async (nodeId, updates) => {
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        const nodeIndex = map.nodes.findIndex((n) => n.id === nodeId);
                        if (nodeIndex !== -1) {
                            map.nodes[nodeIndex] = { ...map.nodes[nodeIndex], ...updates };
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    const dbUpdates: any = {};
                    if (updates.label !== undefined) dbUpdates.label = updates.label;
                    if (updates.keywords !== undefined) dbUpdates.keywords = JSON.stringify(updates.keywords);
                    if (updates.level !== undefined) dbUpdates.level = updates.level;
                    if (updates.parent_id !== undefined) dbUpdates.parent_id = updates.parent_id;
                    if (updates.position !== undefined) {
                        dbUpdates.position_x = updates.position.x;
                        dbUpdates.position_y = updates.position.y;
                    }
                    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

                    await databaseService.updateNode(nodeId, dbUpdates);
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            // ========================================================================
            // Node/Edge CRUD Operations
            // ========================================================================

            addNode: async (mapId, nodeData) => {
                const map = get().maps.get(mapId);
                if (!map) {
                    throw new Error("Mind map not found");
                }

                const nodeId = generateId();
                const newNode: MindMapNode = {
                    ...nodeData,
                    id: nodeId,
                };

                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    const map = state.maps.get(mapId);
                    if (map) {
                        map.nodes.push(newNode);
                        map.updatedAt = new Date();
                    }
                });

                try {
                    await databaseService.createNode(storeNodeToDbNode(newNode, mapId));
                    return nodeId;
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            deleteNode: async (nodeId) => {
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        const nodeIndex = map.nodes.findIndex((n) => n.id === nodeId);
                        if (nodeIndex !== -1) {
                            map.nodes.splice(nodeIndex, 1);
                            // Also remove edges connected to this node
                            map.edges = map.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    await databaseService.deleteNode(nodeId);
                    await databaseService.deleteConnectionsForNode(nodeId);
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            addEdge: async (mapId, edgeData) => {
                const map = get().maps.get(mapId);
                if (!map) {
                    throw new Error("Mind map not found");
                }

                const edgeId = generateId();
                const newEdge: MindMapEdge = {
                    ...edgeData,
                    id: edgeId,
                };

                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    const map = state.maps.get(mapId);
                    if (map) {
                        map.edges.push(newEdge);
                        map.updatedAt = new Date();
                    }
                });

                try {
                    await databaseService.createConnection(storeEdgeToDbConnection(newEdge, mapId));
                    return edgeId;
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            deleteEdge: async (edgeId) => {
                const previousMaps = new Map(get().maps);

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        const edgeIndex = map.edges.findIndex((e) => e.id === edgeId);
                        if (edgeIndex !== -1) {
                            map.edges.splice(edgeIndex, 1);
                            map.updatedAt = new Date();
                        }
                    });
                });

                try {
                    await databaseService.deleteConnection(edgeId);
                } catch (err) {
                    // Rollback
                    set({ maps: previousMaps });
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            // ========================================================================
            // Layout Operations
            // ========================================================================

            autoLayoutMap: async (id: string) => {
                const map = get().maps.get(id);
                if (!map) {
                    throw new Error("Mind map not found");
                }

                set({ isLoading: true, error: null });

                try {
                    // Calculate new positions
                    const layoutedNodes = calculateRadialLayout(map.nodes, map.edges);

                    // Update database with new positions
                    const db = await databaseService.initialize();
                    await db.withTransactionAsync(async () => {
                        for (const node of layoutedNodes) {
                            await databaseService.updateNode(node.id, {
                                position_x: node.position!.x,
                                position_y: node.position!.y,
                            });
                        }
                    });

                    // Update state
                    set((state) => {
                        const map = state.maps.get(id);
                        if (map) {
                            map.nodes = layoutedNodes;
                            map.updatedAt = new Date();
                        }
                        state.isLoading = false;
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            // ========================================================================
            // Sync Operations
            // ========================================================================

            getSyncStatus: async () => {
                try {
                    const changes = await databaseService.getPendingChanges();
                    set({ pendingSyncCount: changes.length });
                    return { pendingChanges: changes.length };
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message });
                    throw err;
                }
            },

            // ========================================================================
            // UI Helpers
            // ========================================================================

            setCurrentMap: (mapId) => {
                set({ currentMapId: mapId });
            },

            clearError: () => {
                set({ error: null });
            },
        })),
        { name: "MindMapStore" }
    )
);

// Re-export types for convenience
export type { MindMapNode, MindMapEdge, MindmapData, MindMap } from "./helpers/mindmap";
