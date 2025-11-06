import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { databaseService } from "@/services/database";

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
  createMap: (data: Omit<MindMap, "id" | "createdAt" | "updatedAt">) => Promise<MindMap>;
  updateMap: (id: string, data: Omit<MindMap, "id" | "createdAt" | "updatedAt">) => Promise<MindMap>;
  deleteMap: (id: string) => Promise<void>;
  setCurrentMap: (map: MindMap | null) => void;
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

      createMap: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const id = Date.now().toString();
          const now = new Date();

          // Create mind map
          await databaseService.createMindMap({ id, title: data.title });

          // Save nodes and connections
          await saveNodesAndConnections(id, data.nodes);

          const newMap: MindMap = {
            ...data,
            id,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => {
            state.maps.push(newMap);
          });

          set({ isLoading: false });
          return newMap;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      updateMap: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const now = new Date();

          // Update mind map title
          await databaseService.updateMindMap(id, { title: data.title });

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
    })),
    { name: "MindMapStore" }
  )
);
