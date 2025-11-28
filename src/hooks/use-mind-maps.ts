import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ConnectionRow,
  databaseService,
  MindMapNodeRow,
  MindMapRow,
} from "@/services/database";
import { MindMap, MindMapNode, MindmapData } from "@/stores/mindmap";

// Convert database rows to store types
function mindMapFromRow(
  row: MindMapRow,
  nodes: MindMapNodeRow[],
  connections: ConnectionRow[]
): MindMap {
  const mappedNodes: MindMapNode[] = nodes.map((node) => ({
    id: node.id,
    label: node.label,
    keywords: JSON.parse(node.keywords || "[]"),
    level: node.level,
    parent_id: node.parent_id ?? null,
    position: { x: node.position_x, y: node.position_y },
    notes: node.notes ?? null,
  }));

  const edges = connections.map((conn) => ({
    from: conn.from_node_id,
    to: conn.to_node_id,
    relationship: conn.relationship ?? undefined,
  }));

  return {
    id: row.id,
    title: row.title,
    central_topic: row.central_topic ?? "",
    summary: row.summary ?? undefined,
    nodes: mappedNodes,
    edges: edges,
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
        central_topic: mindMap.central_topic,
        summary: mindMap.summary,
      };

      await databaseService.createMindMap(row);

      // Create nodes
      for (const node of mindMap.nodes) {
        const nodeRow: Omit<MindMapNodeRow, "created_at" | "updated_at"> = {
          id: node.id,
          mindmap_id: id,
          label: node.label,
          keywords: JSON.stringify(node.keywords),
          level: node.level,
          parent_id: node.parent_id,
          position_x: node.position?.x ?? 0,
          position_y: node.position?.y ?? 0,
          notes: node.notes ?? null,
        };
        await databaseService.createNode(nodeRow);
      }

      // Create connections (edges)
      for (const edge of mindMap.edges) {
        const connectionRow: Omit<ConnectionRow, "created_at"> = {
          id: `${edge.from}-${edge.to}`,
          mindmap_id: id,
          from_node_id: edge.from,
          to_node_id: edge.to,
          relationship: edge.relationship ?? null,
        };
        await databaseService.createConnection(connectionRow);
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
      // Update mind map title/metadata if provided
      if (updates.title || updates.central_topic || updates.summary) {
        await databaseService.updateMindMap(id, {
          title: updates.title,
          central_topic: updates.central_topic,
          summary: updates.summary,
        });
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
              label: node.label,
              keywords: JSON.stringify(node.keywords),
              level: node.level,
              parent_id: node.parent_id,
              position_x: node.position?.x,
              position_y: node.position?.y,
              notes: node.notes ?? null,
            });
          } else {
            // Create new node
            await databaseService.createNode({
              id: node.id,
              mindmap_id: id,
              label: node.label,
              keywords: JSON.stringify(node.keywords),
              level: node.level,
              parent_id: node.parent_id,
              position_x: node.position?.x ?? 0,
              position_y: node.position?.y ?? 0,
              notes: node.notes ?? null,
            });
          }
        }
      }

      // Update edges if provided
      if (updates.edges) {
        // First, delete all existing connections for this mind map
        // (Simpler than diffing for now, can be optimized later)
        const existingConnections =
          await databaseService.getConnectionsForMindMap(id);
        for (const conn of existingConnections) {
          await databaseService.deleteConnection(conn.id);
        }

        // Then create new connections
        for (const edge of updates.edges) {
          await databaseService.createConnection({
            id: `${edge.from}-${edge.to}`,
            mindmap_id: id,
            from_node_id: edge.from,
            to_node_id: edge.to,
            relationship: edge.relationship ?? null,
          });
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
      updates: Partial<Pick<MindMapNode, "label" | "position">>;
    }) => {
      await databaseService.updateNode(nodeId, {
        label: updates.label,
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
        label: node.label,
        keywords: JSON.stringify(node.keywords),
        level: node.level,
        parent_id: node.parent_id,
        position_x: node.position?.x ?? 0,
        position_y: node.position?.y ?? 0,
        notes: node.notes ?? null,
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
      relationship,
    }: {
      mindMapId: string;
      fromNodeId: string;
      toNodeId: string;
      relationship?: string;
    }) => {
      const id = `${fromNodeId}-${toNodeId}`;
      await databaseService.createConnection({
        id,
        mindmap_id: mindMapId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        relationship: relationship ?? null,
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
