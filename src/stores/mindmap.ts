import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { databaseService } from "@/services/database";
import { calculateRadialLayout } from "@/utils/mindmap-layout";

export interface MindMap {
    id: string;
    title: string;
    nodes: MindMapNode[];
    createdAt: Date;
    updatedAt: Date;
}

export interface MindMapNode {
    id: string;
    text: string;
    position: { x: number; y: number };
    connections: string[];
    notes?: string | null;
}

// Mindmap data structure from backend
export interface MindmapData {
    title: string;
    central_topic: string;
    summary?: string;
    nodes: {
        id: string;
        label: string;
        keywords: string[];
        level: number;
        parent_id: string | null;
    }[];
    edges: {
        from: string;
        to: string;
        relationship?: string;
    }[];
}

// Helper functions for database operations
const saveNodesAndConnections = async (mindMapId: string, nodes: MindMapNode[]) => {
    const db = await databaseService.initialize();

    await db.withTransactionAsync(async () => {
        // Batch create all nodes
        const nodePromises = nodes.map((node) =>
            databaseService.createNode({
                id: node.id,
                mindmap_id: mindMapId,
                text: node.text,
                position_x: node.position.x,
                position_y: node.position.y,
            })
        );

        // Batch create all connections
        const connectionPromises = nodes.flatMap((node) =>
            node.connections.map((targetId) =>
                databaseService.createConnection({
                    id: `${node.id}-${targetId}`,
                    mindmap_id: mindMapId,
                    from_node_id: node.id,
                    to_node_id: targetId,
                })
            )
        );

        // Execute all operations in parallel
        await Promise.all([...nodePromises, ...connectionPromises]);
    });
};

const replaceNodesAndConnections = async (mindMapId: string, nodes: MindMapNode[]) => {
    // Use transaction for atomicity and better performance
    const db = await databaseService.initialize();

    await db.withTransactionAsync(async () => {
        // Delete all existing nodes and connections in batch
        const existingNodes = await databaseService.getNodesForMindMap(mindMapId);
        const existingConnections = await databaseService.getConnectionsForMindMap(mindMapId);

        // Batch delete nodes
        const nodeDeletePromises = existingNodes.map(node =>
            databaseService.deleteNode(node.id)
        );

        // Batch delete connections
        const connectionDeletePromises = existingConnections.map(connection =>
            databaseService.deleteConnection(connection.id)
        );

        // Wait for all deletes to complete
        await Promise.all([...nodeDeletePromises, ...connectionDeletePromises]);

        // Batch create nodes and connections
        await saveNodesAndConnections(mindMapId, nodes);
    });
};

interface MindMapState {
    maps: MindMap[];
    currentMap: MindMap | null;
    isLoading: boolean;
    error: string | null;
    loadMaps: () => Promise<void>;
    loadMap: (id: string) => Promise<void>;
    updateMap: (id: string, data: Omit<MindMap, "id" | "createdAt" | "updatedAt">) => Promise<MindMap>;
    deleteMap: (id: string) => Promise<void>;
    setCurrentMap: (map: MindMap | null) => void;
    updateNodeNotes: (nodeId: string, notes: string | null) => Promise<void>;
    autoLayoutMap: (id: string) => Promise<void>;
    createFromPdf: (mindmapId: string, title: string, mindmapData: MindmapData) => Promise<void>;
}

export const useMindMapStore = create<MindMapState>()(
    devtools(
        immer((set, get) => ({
            maps: [],
            currentMap: null,
            isLoading: false,
            error: null,

            loadMaps: async () => {
                set({ isLoading: true, error: null });
                try {
                    const mindMaps = await databaseService.getAllMindMaps();
                    const maps: MindMap[] = [];

                    // Load full data for each mind map
                    for (const row of mindMaps) {
                        const fullMindMap = await databaseService.getFullMindMap(row.id);
                        if (fullMindMap) {
                            const nodeMap = new Map<string, MindMapNode>();

                            // Convert nodes
                            fullMindMap.nodes.forEach((node) => {
                                const nodeConnections = fullMindMap.connections
                                    .filter((conn) => conn.from_node_id === node.id)
                                    .map((conn) => conn.to_node_id);

                                nodeMap.set(node.id, {
                                    id: node.id,
                                    text: node.text,
                                    position: { x: node.position_x, y: node.position_y },
                                    connections: nodeConnections,
                                    notes: node.notes ?? null,
                                });
                            });

                            maps.push({
                                id: fullMindMap.mindMap.id,
                                title: fullMindMap.mindMap.title,
                                nodes: Array.from(nodeMap.values()),
                                createdAt: new Date(fullMindMap.mindMap.created_at),
                                updatedAt: new Date(fullMindMap.mindMap.updated_at),
                            });
                        }
                    }

                    set({ maps, isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                }
            },

            updateNodeNotes: async (nodeId, notes) => {
                const previousState = get();

                // Optimistic update
                set((state) => {
                    state.maps.forEach((map) => {
                        map.nodes.forEach((node) => {
                            if (node.id === nodeId) {
                                node.notes = notes ?? null;
                            }
                        });
                    });

                    if (state.currentMap) {
                        state.currentMap.nodes.forEach((node) => {
                            if (node.id === nodeId) {
                                node.notes = notes ?? null;
                            }
                        });
                    }
                });

                try {
                    await databaseService.updateNode(nodeId, {
                        notes: notes ?? null,
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);

                    // Rollback on error
                    set((state) => {
                        state.maps = previousState.maps;
                        state.currentMap = previousState.currentMap;
                        state.error = message;
                    });

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

                    const nodeMap = new Map<string, MindMapNode>();

                    // Convert nodes
                    fullMindMap.nodes.forEach((node) => {
                        const nodeConnections = fullMindMap.connections
                            .filter((conn) => conn.from_node_id === node.id)
                            .map((conn) => conn.to_node_id);

                        nodeMap.set(node.id, {
                            id: node.id,
                            text: node.text,
                            position: { x: node.position_x, y: node.position_y },
                            connections: nodeConnections,
                            notes: node.notes ?? null,
                        });
                    });

                    const map: MindMap = {
                        id: fullMindMap.mindMap.id,
                        title: fullMindMap.mindMap.title,
                        nodes: Array.from(nodeMap.values()),
                        createdAt: new Date(fullMindMap.mindMap.created_at),
                        updatedAt: new Date(fullMindMap.mindMap.updated_at),
                    };

                    set({ currentMap: map, isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                }
            },

            updateMap: async (id, data) => {
                set({ isLoading: true, error: null });
                try {
                    const now = new Date();

                    // Update mind map title
                    await databaseService.updateMindMap(id, {
                        title: data.title,
                    });

                    // Replace all nodes and connections (simple approach)
                    await replaceNodesAndConnections(id, data.nodes);

                    const updatedMap: MindMap = {
                        ...data,
                        id,
                        createdAt: get().maps.find(m => m.id === id)?.createdAt || now,
                        updatedAt: now,
                    };

                    set((state) => {
                        const index = state.maps.findIndex((m) => m.id === id);
                        if (index !== -1) {
                            state.maps[index] = updatedMap;
                        }

                        if (state.currentMap?.id === id) {
                            state.currentMap = updatedMap;
                        }
                    });

                    set({ isLoading: false });
                    return updatedMap;
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            deleteMap: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    await databaseService.deleteMindMap(id);

                    set((state) => {
                        state.maps = state.maps.filter((m) => m.id !== id);
                        if (state.currentMap?.id === id) {
                            state.currentMap = null;
                        }
                    });

                    set({ isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            setCurrentMap: (map) => {
                set({ currentMap: map });
            },

            autoLayoutMap: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    // Get current map
                    const map = get().maps.find(m => m.id === id) || get().currentMap;
                    if (!map || map.id !== id) {
                        throw new Error("Mind map not found");
                    }

                    // Calculate new positions
                    const layoutedNodes = calculateRadialLayout(map.nodes);

                    // Update database with new positions
                    const db = await databaseService.initialize();
                    await db.withTransactionAsync(async () => {
                        const updatePromises = layoutedNodes.map(node =>
                            databaseService.updateNode(node.id, {
                                position_x: node.position.x,
                                position_y: node.position.y,
                            })
                        );
                        await Promise.all(updatePromises);
                    });

                    // Update state
                    set((state) => {
                        const mapIndex = state.maps.findIndex(m => m.id === id);
                        if (mapIndex !== -1) {
                            state.maps[mapIndex].nodes = layoutedNodes;
                            state.maps[mapIndex].updatedAt = new Date();
                        }

                        if (state.currentMap?.id === id) {
                            state.currentMap.nodes = layoutedNodes;
                            state.currentMap.updatedAt = new Date();
                        }
                    });

                    set({ isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            createFromPdf: async (mindmapId: string, title: string, mindmapData: MindmapData) => {
                set({ isLoading: true, error: null });
                try {
                    // Transform backend mindmap structure to frontend format
                    const nodes: MindMapNode[] = mindmapData.nodes.map((node) => {
                        // Find connections from edges
                        const connections = mindmapData.edges
                            .filter(edge => edge.from === node.id)
                            .map(edge => edge.to);

                        return {
                            id: node.id,
                            text: node.label,
                            position: { x: 0, y: 0 }, // Temporary position, will be calculated by layout
                            connections,
                            notes: node.keywords.join(', ') || null,
                        };
                    });

                    // Apply auto layout for better visual hierarchy
                    const layoutedNodes = calculateRadialLayout(nodes);

                    // Save to local database
                    await databaseService.createMindMap({
                        id: mindmapId,
                        title,
                    });

                    // Save nodes and connections to database
                    await saveNodesAndConnections(mindmapId, layoutedNodes);

                    const newMap: MindMap = {
                        id: mindmapId,
                        title,
                        nodes: layoutedNodes,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    set((state) => {
                        state.maps.push(newMap);
                        state.currentMap = newMap;
                    });

                    set({ isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },
        })),
        { name: "MindMapStore" }
    )
);
