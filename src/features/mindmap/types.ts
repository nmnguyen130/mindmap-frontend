// Re-export database types for convenience
export type {
  ConnectionRow,
  FullMindMap,
  MindMapNodeRow,
  MindMapRow,
} from "@/database";

// Import for internal use
import type { ConnectionRow, FullMindMap, MindMapNodeRow } from "@/database";

// UI-friendly types (for components that don't need raw DB types)

export interface MindMapNode {
  id: string;
  label: string;
  keywords?: string[];
  level: number;
  parent_id?: string | null;
  position: { x: number; y: number };
  notes?: string;
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  relationship?: string;
}

export interface MindMap {
  id: string;
  title: string;
  central_topic?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface MindmapData {
  title: string;
  central_topic?: string;
  summary?: string;
  nodes: MindMapNode[];
  edges: Omit<MindMapEdge, "id">[];
}

// Converters: DB Row to UI Type

export function dbRowToMindMapNode(row: MindMapNodeRow): MindMapNode {
  return {
    id: row.id,
    label: row.label,
    keywords: row.keywords ? JSON.parse(row.keywords) : [],
    level: row.level,
    parent_id: row.parent_id,
    position: { x: row.position_x, y: row.position_y },
    notes: row.notes,
  };
}

export function dbRowToMindMapEdge(row: ConnectionRow): MindMapEdge {
  return {
    id: row.id,
    from: row.from_node_id,
    to: row.to_node_id,
    relationship: row.relationship,
  };
}

export function fullMindmapToUI(full: FullMindMap): MindMap {
  return {
    id: full.mindMap.id,
    title: full.mindMap.title,
    central_topic: full.mindMap.central_topic,
    summary: full.mindMap.summary,
    createdAt: new Date(full.mindMap.created_at),
    updatedAt: new Date(full.mindMap.updated_at),
    nodes: full.nodes.map(dbRowToMindMapNode),
    edges: full.connections.map(dbRowToMindMapEdge),
  };
}
