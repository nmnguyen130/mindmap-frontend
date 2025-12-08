import type * as SQLite from "expo-sqlite";

export type DB = SQLite.SQLiteDatabase;
export type SQLiteBindParams = SQLite.SQLiteBindParams;

// Core entity interfaces
export interface MindMapRow {
  id: string; // UUID
  title: string;
  central_topic?: string;
  summary?: string;
  document_id?: string;
  created_at: number; // milliseconds timestamp
  updated_at: number; // milliseconds timestamp
  // Sync metadata
  is_synced: boolean;
  last_synced_at?: number; // milliseconds timestamp
  version: number;
  deleted_at?: number; // milliseconds timestamp (soft delete)
}

export interface MindMapNodeRow {
  id: string; // UUID
  mindmap_id: string;
  label: string;
  keywords?: string; // JSON string array
  level: number;
  parent_id?: string;
  position_x: number;
  position_y: number;
  notes?: string;
  created_at: number;
  updated_at: number;
  // Sync metadata
  is_synced: boolean;
  last_synced_at?: number;
  version: number;
  deleted_at?: number;
}

export interface ConnectionRow {
  id: string; // UUID
  mindmap_id: string;
  from_node_id: string;
  to_node_id: string;
  relationship?: string;
  created_at: number;
  updated_at: number;
  // Sync metadata
  is_synced: boolean;
  last_synced_at?: number;
  version: number;
  deleted_at?: number;
}

export interface ChangeRow {
  id: string; // UUID
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_at: number; // milliseconds timestamp
  synced: boolean;
}

export interface SettingsRow {
  key: string;
  value: string;
  updated_at: number;
}

export type FullMindMap = {
  mindMap: MindMapRow;
  nodes: MindMapNodeRow[];
  connections: ConnectionRow[];
};