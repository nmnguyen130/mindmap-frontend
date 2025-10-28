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

interface MindMapState {
  maps: MindMap[];
  currentMap: MindMap | null;
  isLoading: boolean;
  error: string | null;
  loadMaps: () => Promise<void>;
  loadMap: (id: string) => Promise<void>;
  createMap: (
    data: Omit<MindMap, "id" | "createdAt" | "updatedAt">
  ) => Promise<MindMap>;
  updateMap: (id: string, updates: Partial<MindMap>) => Promise<void>;
  deleteMap: (id: string) => Promise<void>;
  setCurrentMap: (map: MindMap | null) => void;
  addNode: (mapId: string, node: Omit<MindMapNode, "id">) => Promise<void>;
  updateNode: (
    mapId: string,
    nodeId: string,
    updates: Partial<MindMapNode>
  ) => Promise<void>;
  deleteNode: (mapId: string, nodeId: string) => Promise<void>;
  addConnection: (
    mapId: string,
    fromNodeId: string,
    toNodeId: string
  ) => Promise<void>;
  deleteConnection: (mapId: string, connectionId: string) => Promise<void>;
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

          // Create mind map
          await databaseService.createMindMap({
            id,
            title: data.title,
          });

          // Create nodes
          for (const node of data.nodes) {
            await databaseService.createNode({
              id: node.id,
              mindmap_id: id,
              text: node.text,
              position_x: node.position.x,
              position_y: node.position.y,
            });
          }

          // Create connections
          for (const node of data.nodes) {
            for (const targetId of node.connections) {
              await databaseService.createConnection({
                id: `${node.id}-${targetId}`,
                mindmap_id: id,
                from_node_id: node.id,
                to_node_id: targetId,
              });
            }
          }

          const newMap: MindMap = {
            ...data,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
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

      updateMap: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          // Update mind map title if provided
          if (updates.title) {
            await databaseService.updateMindMap(id, { title: updates.title });
          }

          // Update nodes if provided
          if (updates.nodes) {
            // Get existing nodes to compare
            const existing = await databaseService.getNodesForMindMap(id);
            const existingNodeIds = new Set(existing.map((n) => n.id));
            const updatedNodeIds = new Set(updates.nodes.map((n) => n.id));

            // Delete nodes that are no longer present
            for (const nodeId of existingNodeIds) {
              if (!updatedNodeIds.has(nodeId)) {
                await databaseService.deleteNode(nodeId);
              }
            }

            // Update or create nodes
            for (const node of updates.nodes) {
              if (existingNodeIds.has(node.id)) {
                // Update existing node
                await databaseService.updateNode(node.id, {
                  text: node.text,
                  position_x: node.position.x,
                  position_y: node.position.y,
                });
              } else {
                // Create new node
                await databaseService.createNode({
                  id: node.id,
                  mindmap_id: id,
                  text: node.text,
                  position_x: node.position.x,
                  position_y: node.position.y,
                });
              }
            }

            // Update connections - SMART DIFF APPROACH
            // Instead of deleting all and recreating all, only update what changed
            const existingConnections = await databaseService.getConnectionsForMindMap(id);

            // Create a map of existing connections for easy lookup
            const existingConnectionMap = new Map<string, typeof existingConnections[0]>();
            existingConnections.forEach(conn => {
              existingConnectionMap.set(conn.id, conn);
            });

            // Collect all connections that should exist in the new state
            const newConnections = new Set<string>();
            updates.nodes.forEach(node => {
              node.connections.forEach(targetId => {
                newConnections.add(`${node.id}-${targetId}`);
              });
            });

            // Find connections to delete (exist in old but not in new)
            const connectionsToDelete = existingConnections.filter(
              conn => !newConnections.has(conn.id)
            );

            // Find connections to add (exist in new but not in old)
            const connectionsToAdd = Array.from(newConnections).filter(
              connId => !existingConnectionMap.has(connId)
            );

            // Delete removed connections
            for (const conn of connectionsToDelete) {
              await databaseService.deleteConnection(conn.id);
            }

            // Add new connections
            for (const connId of connectionsToAdd) {
              const [fromNodeId, toNodeId] = connId.split('-');
              await databaseService.createConnection({
                id: connId,
                mindmap_id: id,
                from_node_id: fromNodeId,
                to_node_id: toNodeId,
              });
            }
          }

          // Update local state
          set((state) => {
            const index = state.maps.findIndex((m) => m.id === id);
            if (index !== -1) {
              state.maps[index] = {
                ...state.maps[index],
                ...updates,
                updatedAt: new Date(),
              };
            }

            if (state.currentMap?.id === id) {
              state.currentMap = {
                ...state.currentMap,
                ...updates,
                updatedAt: new Date(),
              };
            }
          });

          set({ isLoading: false });
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

      // Real-time node operations
      addNode: async (mapId, node) => {
        try {
          const id = Date.now().toString();
          await databaseService.createNode({
            id,
            mindmap_id: mapId,
            text: node.text,
            position_x: node.position.x,
            position_y: node.position.y,
          });

          // Update mind map timestamp
          await databaseService.updateMindMap(mapId, {});

          // Update local state
          set((state) => {
            const newNode: MindMapNode = { ...node, id };

            // Update in maps list
            const mapIndex = state.maps.findIndex((m) => m.id === mapId);
            if (mapIndex !== -1) {
              state.maps[mapIndex].nodes.push(newNode);
              state.maps[mapIndex].updatedAt = new Date();
            }

            // Update current map if it's the one being modified
            if (state.currentMap?.id === mapId) {
              state.currentMap.nodes.push(newNode);
              state.currentMap.updatedAt = new Date();
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message });
          throw err;
        }
      },

      updateNode: async (mapId, nodeId, updates) => {
        try {
          await databaseService.updateNode(nodeId, {
            text: updates.text,
            position_x: updates.position?.x,
            position_y: updates.position?.y,
          });

          // Update mind map timestamp
          await databaseService.updateMindMap(mapId, {});

          // Update local state
          set((state) => {
            // Update in maps list
            const mapIndex = state.maps.findIndex((m) => m.id === mapId);
            if (mapIndex !== -1) {
              const nodeIndex = state.maps[mapIndex].nodes.findIndex(
                (n) => n.id === nodeId
              );
              if (nodeIndex !== -1) {
                state.maps[mapIndex].nodes[nodeIndex] = {
                  ...state.maps[mapIndex].nodes[nodeIndex],
                  ...updates,
                };
                state.maps[mapIndex].updatedAt = new Date();
              }
            }

            // Update current map if it's the one being modified
            if (state.currentMap?.id === mapId) {
              const nodeIndex = state.currentMap.nodes.findIndex(
                (n) => n.id === nodeId
              );
              if (nodeIndex !== -1) {
                state.currentMap.nodes[nodeIndex] = {
                  ...state.currentMap.nodes[nodeIndex],
                  ...updates,
                };
                state.currentMap.updatedAt = new Date();
              }
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message });
          throw err;
        }
      },

      deleteNode: async (mapId, nodeId) => {
        try {
          await databaseService.deleteNode(nodeId);

          // Update mind map timestamp
          await databaseService.updateMindMap(mapId, {});

          // Update local state
          set((state) => {
            // Update in maps list
            const mapIndex = state.maps.findIndex((m) => m.id === mapId);
            if (mapIndex !== -1) {
              state.maps[mapIndex].nodes = state.maps[mapIndex].nodes.filter(
                (n) => n.id !== nodeId
              );
              state.maps[mapIndex].updatedAt = new Date();
            }

            // Update current map if it's the one being modified
            if (state.currentMap?.id === mapId) {
              state.currentMap.nodes = state.currentMap.nodes.filter(
                (n) => n.id !== nodeId
              );
              state.currentMap.updatedAt = new Date();
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message });
          throw err;
        }
      },

      addConnection: async (mapId, fromNodeId, toNodeId) => {
        try {
          const id = `${fromNodeId}-${toNodeId}`;
          await databaseService.createConnection({
            id,
            mindmap_id: mapId,
            from_node_id: fromNodeId,
            to_node_id: toNodeId,
          });

          // Update mind map timestamp
          await databaseService.updateMindMap(mapId, {});

          // Update local state
          set((state) => {
            // Update in maps list
            const mapIndex = state.maps.findIndex((m) => m.id === mapId);
            if (mapIndex !== -1) {
              const fromNode = state.maps[mapIndex].nodes.find(
                (n) => n.id === fromNodeId
              );
              if (fromNode && !fromNode.connections.includes(toNodeId)) {
                fromNode.connections.push(toNodeId);
                state.maps[mapIndex].updatedAt = new Date();
              }
            }

            // Update current map if it's the one being modified
            if (state.currentMap?.id === mapId) {
              const fromNode = state.currentMap.nodes.find(
                (n) => n.id === fromNodeId
              );
              if (fromNode && !fromNode.connections.includes(toNodeId)) {
                fromNode.connections.push(toNodeId);
                state.currentMap.updatedAt = new Date();
              }
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message });
          throw err;
        }
      },

      deleteConnection: async (mapId, connectionId) => {
        try {
          await databaseService.deleteConnection(connectionId);

          // Update mind map timestamp
          await databaseService.updateMindMap(mapId, {});

          // Parse connection ID to get from and to node IDs
          const [fromNodeId, toNodeId] = connectionId.split("-");

          // Update local state
          set((state) => {
            // Update in maps list
            const mapIndex = state.maps.findIndex((m) => m.id === mapId);
            if (mapIndex !== -1) {
              const fromNode = state.maps[mapIndex].nodes.find(
                (n) => n.id === fromNodeId
              );
              if (fromNode) {
                fromNode.connections = fromNode.connections.filter(
                  (id) => id !== toNodeId
                );
                state.maps[mapIndex].updatedAt = new Date();
              }
            }

            // Update current map if it's the one being modified
            if (state.currentMap?.id === mapId) {
              const fromNode = state.currentMap.nodes.find(
                (n) => n.id === fromNodeId
              );
              if (fromNode) {
                fromNode.connections = fromNode.connections.filter(
                  (id) => id !== toNodeId
                );
                state.currentMap.updatedAt = new Date();
              }
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message });
          throw err;
        }
      },
    })),
    { name: "MindMapStore" }
  )
);
