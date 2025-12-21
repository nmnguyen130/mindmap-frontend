import type { MindMapRow } from "@/database";
import { connectionQueries, mindmapQueries, nodeQueries } from "@/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys factory
export const mindmapKeys = {
  all: ["mindmaps"] as const,
  lists: () => [...mindmapKeys.all, "list"] as const,
  list: () => mindmapKeys.lists(),
  details: () => [...mindmapKeys.all, "detail"] as const,
  detail: (id: string) => [...mindmapKeys.details(), id] as const,
};

// Types
interface CreateMindmapData {
  id: string;
  title: string;
  central_topic?: string;
  summary?: string;
  document_id?: string;
  nodes?: Array<{
    id: string;
    label: string;
    keywords?: string[];
    level: number;
    parent_id?: string;
    position: { x: number; y: number };
    notes?: string;
  }>;
  edges?: Array<{
    id: string;
    from: string;
    to: string;
    relationship?: string;
  }>;
}

interface AddNodeData {
  id: string;
  mindmap_id: string;
  label: string;
  level: number;
  parent_id?: string;
  position_x: number;
  position_y: number;
}

interface UpdateNodeData {
  id: string;
  mindmapId: string;
  label?: string;
  keywords?: string;
  notes?: string;
}

/**
 * Main mindmap hook - consolidated access to all mindmap operations
 * Similar pattern to useAuth
 */
export function useMindmaps() {
  const queryClient = useQueryClient();

  // List query - all mindmaps (metadata only)
  const listQuery = useQuery({
    queryKey: mindmapKeys.list(),
    queryFn: () => mindmapQueries.getAll(),
    staleTime: 1000 * 60,
  });

  // Create mindmap
  const create = useMutation({
    mutationFn: async (data: CreateMindmapData) => {
      await mindmapQueries.create({
        id: data.id,
        title: data.title,
        central_topic: data.central_topic,
        summary: data.summary,
        document_id: data.document_id,
      });

      if (data.nodes) {
        for (const node of data.nodes) {
          await nodeQueries.create({
            id: node.id,
            mindmap_id: data.id,
            label: node.label,
            keywords: JSON.stringify(node.keywords ?? []),
            level: node.level,
            parent_id: node.parent_id,
            position_x: node.position.x,
            position_y: node.position.y,
            notes: node.notes,
          });
        }
      }

      if (data.edges) {
        for (const edge of data.edges) {
          await connectionQueries.create({
            id: edge.id,
            mindmap_id: data.id,
            from_node_id: edge.from,
            to_node_id: edge.to,
            relationship: edge.relationship,
          });
        }
      }
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
    },
  });

  // Update mindmap metadata
  const update = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<MindMapRow, "title" | "central_topic" | "summary">
    >) => {
      await mindmapQueries.update(id, updates);
      return { id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: mindmapKeys.detail(result.id),
      });
      queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
    },
  });

  // Delete mindmap
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await mindmapQueries.softDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mindmapKeys.all });
    },
  });

  return {
    // State
    mindmaps: listQuery.data ?? [],
    isLoading: listQuery.isPending,
    error: listQuery.error,

    // Mutations
    create,
    update,
    remove,

    // Utilities
    refetch: listQuery.refetch,
  };
}

/**
 * Single mindmap hook - for viewing/editing a specific mindmap
 */
export function useMindmap(id: string | null) {
  const queryClient = useQueryClient();

  // Detail query - full mindmap with nodes and connections
  const detailQuery = useQuery({
    queryKey: mindmapKeys.detail(id ?? ""),
    queryFn: () => (id ? mindmapQueries.getFull(id) : null),
    enabled: !!id,
    staleTime: 1000 * 30,
  });

  // Node: update position (single)
  const updateNodePosition = useMutation({
    mutationFn: async ({
      nodeId,
      x,
      y,
    }: {
      nodeId: string;
      x: number;
      y: number;
    }) => {
      await nodeQueries.updatePosition(nodeId, x, y);
    },
  });
  // Node: batch update positions
  const updateNodePositions = useMutation({
    mutationFn: async (
      updates: Array<{ id: string; x: number; y: number }>
    ) => {
      await nodeQueries.updatePositionsBatch(updates);
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  // Node: update data
  const updateNode = useMutation({
    mutationFn: async ({
      nodeId,
      ...updates
    }: { nodeId: string } & Partial<UpdateNodeData>) => {
      await nodeQueries.update(nodeId, updates);
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  // Node: add
  const addNode = useMutation({
    mutationFn: async (node: AddNodeData) => {
      await nodeQueries.create({ ...node, keywords: "[]" });
      return node;
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  // Node: delete
  const deleteNode = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeQueries.softDelete(nodeId);
      await connectionQueries.deleteByNode(nodeId);
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  // Connection: add
  const addConnection = useMutation({
    mutationFn: async (conn: {
      id: string;
      from_node_id: string;
      to_node_id: string;
      relationship?: string;
    }) => {
      if (!id) throw new Error("No mindmap id");
      await connectionQueries.create({ ...conn, mindmap_id: id });
      return conn;
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  // Connection: delete
  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      await connectionQueries.softDelete(connectionId);
    },
    onSuccess: () => {
      if (id)
        queryClient.invalidateQueries({ queryKey: mindmapKeys.detail(id) });
    },
  });

  return {
    // State
    data: detailQuery.data,
    mindmap: detailQuery.data?.mindMap ?? null,
    nodes: detailQuery.data?.nodes ?? [],
    connections: detailQuery.data?.connections ?? [],
    isLoading: detailQuery.isPending,
    error: detailQuery.error,

    // Node mutations
    updateNodePosition,
    updateNodePositions,
    updateNode,
    addNode,
    deleteNode,

    // Connection mutations
    addConnection,
    deleteConnection,

    // Utilities
    refetch: detailQuery.refetch,
  };
}
