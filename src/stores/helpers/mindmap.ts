import type { MindMapRow, MindMapNodeRow, ConnectionRow } from "@/services/database";

// Forward declare types to avoid circular dependency
export interface MindMapNode {
    id: string;
    label: string;
    keywords: string[];
    level: number;
    parent_id: string | null;
    position?: { x: number; y: number };
    notes?: string | null;
}

export interface MindMapEdge {
    id: string;
    from: string;
    to: string;
    relationship?: string;
}

export interface MindmapData {
    title: string;
    central_topic: string;
    summary?: string;
    nodes: MindMapNode[];
    edges: MindMapEdge[];
}

export interface MindMap extends MindmapData {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    // Sync metadata
    isSynced: boolean;
    lastSyncedAt: Date | null;
    version: number;
}

/**
 * Generate a unique ID for mindmap entities
 * Uses timestamp + random string for better uniqueness than Date.now() alone
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Transform database rows to MindMap store model
 */
export function dbRowToMindMap(
    row: MindMapRow,
    nodes: MindMapNodeRow[],
    connections: ConnectionRow[]
): MindMap {
    return {
        id: row.id,
        title: row.title,
        central_topic: row.central_topic ?? "",
        summary: row.summary ?? undefined,
        nodes: nodes.map(dbNodeToStoreNode),
        edges: connections.map(dbConnectionToStoreEdge),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Sync metadata
        isSynced: row.is_synced === 1,
        lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
        version: row.version,
    };
}

/**
 * Transform database node row to store node model
 */
export function dbNodeToStoreNode(node: MindMapNodeRow): MindMapNode {
    return {
        id: node.id,
        label: node.label,
        keywords: JSON.parse(node.keywords || "[]"),
        level: node.level,
        parent_id: node.parent_id ?? null,
        position: { x: node.position_x, y: node.position_y },
        notes: node.notes ?? null,
    };
}

/**
 * Transform database connection row to store edge model
 */
export function dbConnectionToStoreEdge(conn: ConnectionRow): MindMapEdge {
    return {
        id: conn.id,
        from: conn.from_node_id,
        to: conn.to_node_id,
        relationship: conn.relationship ?? undefined,
    };
}

/**
 * Transform store node to database node row data
 */
export function storeNodeToDbNode(
    node: MindMapNode,
    mindmapId: string
): Omit<MindMapNodeRow, "created_at" | "updated_at" | "is_synced" | "last_synced_at" | "version" | "deleted_at"> {
    return {
        id: node.id,
        mindmap_id: mindmapId,
        label: node.label,
        keywords: JSON.stringify(node.keywords),
        level: node.level,
        parent_id: node.parent_id,
        position_x: node.position?.x ?? 0,
        position_y: node.position?.y ?? 0,
        notes: node.notes ?? null,
    };
}

/**
 * Transform store edge to database connection row data
 */
export function storeEdgeToDbConnection(
    edge: MindMapEdge,
    mindmapId: string
): Omit<ConnectionRow, "created_at" | "updated_at" | "is_synced" | "last_synced_at" | "version" | "deleted_at"> {
    return {
        id: edge.id,
        mindmap_id: mindmapId,
        from_node_id: edge.from,
        to_node_id: edge.to,
        relationship: edge.relationship ?? null,
    };
}
