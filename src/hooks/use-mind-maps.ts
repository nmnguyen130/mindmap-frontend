import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ConnectionRow,
  databaseService,
  MindMapNodeRow,
  MindMapRow,
} from "@/services/database";
import { MindMap, MindMapNode } from "@/stores/mindmaps";

// Convert database rows to store types
function mindMapFromRow(
  row: MindMapRow,
  nodes: MindMapNodeRow[],
  connections: ConnectionRow[]
): MindMap {
  const nodeMap = new Map<string, MindMapNode>();

  // Convert nodes
  nodes.forEach((node) => {
    const nodeConnections = connections
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

  return {
    id: row.id,
    title: row.title,
    nodes: Array.from(nodeMap.values()),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Mind Map hooks
export function useMindMaps() {
  return useQuery({
    queryKey: ["mindmaps"],
    queryFn: async () => {
      const mindMaps = await databaseService.getAllMindMaps();
      return mindMaps.map((row) => ({
        ...row,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useMindMap(id: string) {
  return useQuery({
    queryKey: ["mindmap", id],
    queryFn: async () => {
      const fullMindMap = await databaseService.getFullMindMap(id);
      if (!fullMindMap) return null;

      return mindMapFromRow(
        fullMindMap.mindMap,
        fullMindMap.nodes,
        fullMindMap.connections
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
}

export function useCreateMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      mindMap: Omit<MindMap, "id" | "createdAt" | "updatedAt">
    ) => {
      const id = Date.now().toString();
      const row: Omit<MindMapRow, "created_at" | "updated_at"> = {
        id,
        title: mindMap.title,
      };

      await databaseService.createMindMap(row);

      // Create nodes
      for (const node of mindMap.nodes) {
        const nodeRow: Omit<MindMapNodeRow, "created_at" | "updated_at"> = {
          id: node.id,
          mindmap_id: id,
          text: node.text,
          position_x: node.position.x,
          position_y: node.position.y,
          notes: node.notes ?? null,
        };
        await databaseService.createNode(nodeRow);

        // Create connections
        for (const targetId of node.connections) {
          const connectionRow: Omit<ConnectionRow, "created_at"> = {
            id: `${node.id}-${targetId}`,
            mindmap_id: id,
            from_node_id: node.id,
            to_node_id: targetId,
          };
          await databaseService.createConnection(connectionRow);
        }
      }

      return { ...mindMap, id, createdAt: new Date(), updatedAt: new Date() };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
    },
  });
}

export function useUpdateMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<MindMap>;
    }) => {
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
              notes: node.notes ?? null,
            });
          } else {
            // Create new node
            await databaseService.createNode({
              id: node.id,
              mindmap_id: id,
              text: node.text,
              position_x: node.position.x,
              position_y: node.position.y,
              notes: node.notes ?? null,
            });
          }
        }

        // Update connections
        // First, delete all existing connections for this mind map
        const existingConnections =
          await databaseService.getConnectionsForMindMap(id);
        for (const conn of existingConnections) {
          await databaseService.deleteConnection(conn.id);
        }

        // Then create new connections
        for (const node of updates.nodes) {
          for (const targetId of node.connections) {
            await databaseService.createConnection({
              id: `${node.id}-${targetId}`,
              mindmap_id: id,
              from_node_id: node.id,
              to_node_id: targetId,
            });
          }
        }
      }

      return { id, updates };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
      void queryClient.invalidateQueries({ queryKey: ["mindmap", data.id] });
    },
  });
}

export function useDeleteMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await databaseService.deleteMindMap(id);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
    },
  });
}

// Node-specific hooks for real-time updates
export function useUpdateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mindMapId,
      nodeId,
      updates,
    }: {
      mindMapId: string;
      nodeId: string;
      updates: Partial<Pick<MindMapNode, "text" | "position">>;
    }) => {
      await databaseService.updateNode(nodeId, {
        text: updates.text,
        position_x: updates.position?.x,
        position_y: updates.position?.y,
      });

      // Update the mind map's updated_at timestamp
      await databaseService.updateMindMap(mindMapId, {});

      return { mindMapId, nodeId, updates };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["mindmap", data.mindMapId],
      });
    },
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mindMapId,
      node,
    }: {
      mindMapId: string;
      node: Omit<MindMapNode, "id">;
    }) => {
      const id = Date.now().toString();
      await databaseService.createNode({
        id,
        mindmap_id: mindMapId,
        text: node.text,
        position_x: node.position.x,
        position_y: node.position.y,
      });

      // Update the mind map's updated_at timestamp
      await databaseService.updateMindMap(mindMapId, {});

      return { ...node, id };
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["mindmap", variables.mindMapId],
      });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mindMapId,
      nodeId,
    }: {
      mindMapId: string;
      nodeId: string;
    }) => {
      await databaseService.deleteNode(nodeId);

      // Update the mind map's updated_at timestamp
      await databaseService.updateMindMap(mindMapId, {});

      return { mindMapId, nodeId };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["mindmap", data.mindMapId],
      });
    },
  });
}

// Connection hooks
export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mindMapId,
      fromNodeId,
      toNodeId,
    }: {
      mindMapId: string;
      fromNodeId: string;
      toNodeId: string;
    }) => {
      const id = `${fromNodeId}-${toNodeId}`;
      await databaseService.createConnection({
        id,
        mindmap_id: mindMapId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
      });

      // Update the mind map's updated_at timestamp
      await databaseService.updateMindMap(mindMapId, {});

      return { id, fromNodeId, toNodeId };
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["mindmap", variables.mindMapId],
      });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mindMapId,
      connectionId,
    }: {
      mindMapId: string;
      connectionId: string;
    }) => {
      await databaseService.deleteConnection(connectionId);

      // Update the mind map's updated_at timestamp
      await databaseService.updateMindMap(mindMapId, {});

      return { mindMapId, connectionId };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["mindmap", data.mindMapId],
      });
    },
  });
}
