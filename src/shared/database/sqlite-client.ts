import * as SQLite from "expo-sqlite";

export interface MindMapRow {
  id: string;
  title: string;
  central_topic?: string | null;
  summary?: string | null;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
  // Sync metadata
  is_synced: number; // 0 or 1
  last_synced_at?: string | null;
  version: number;
  deleted_at?: string | null;
}

export interface MindMapNodeRow {
  id: string;
  mindmap_id: string;
  label: string;
  keywords?: string | null; // JSON string
  level: number;
  parent_id?: string | null;
  position_x: number;
  position_y: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Sync metadata
  is_synced: number; // 0 or 1
  last_synced_at?: string | null;
  version: number;
  deleted_at?: string | null;
}

export interface ConnectionRow {
  id: string;
  mindmap_id: string;
  from_node_id: string;
  to_node_id: string;
  relationship?: string | null;
  created_at: string;
  updated_at: string;
  // Sync metadata
  is_synced: number; // 0 or 1
  last_synced_at?: string | null;
  version: number;
  deleted_at?: string | null;
}

export interface ChangeRow {
  id: number;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_at: number; // Unix timestamp in ms
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    try {
      this.db = await SQLite.openDatabaseAsync("mindmap.db");
      await this.db.execAsync("PRAGMA journal_mode = WAL;");
      await this.db.execAsync("PRAGMA foreign_keys = ON;"); // Enable foreign key constraints

      await this.createTables();
      return this.db;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.withTransactionAsync(async () => {
      // 1. Create Tables
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS mindmaps (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          central_topic TEXT,
          summary TEXT,
          document_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_synced INTEGER DEFAULT 0,
          last_synced_at DATETIME,
          version INTEGER DEFAULT 1,
          deleted_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS mindmap_nodes (
          id TEXT PRIMARY KEY,
          mindmap_id TEXT NOT NULL,
          label TEXT NOT NULL,
          keywords TEXT,
          level INTEGER NOT NULL DEFAULT 0,
          parent_id TEXT,
          position_x REAL NOT NULL,
          position_y REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_synced INTEGER DEFAULT 0,
          last_synced_at DATETIME,
          version INTEGER DEFAULT 1,
          deleted_at DATETIME,
          FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS connections (
          id TEXT PRIMARY KEY,
          mindmap_id TEXT NOT NULL,
          from_node_id TEXT NOT NULL,
          to_node_id TEXT NOT NULL,
          relationship TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_synced INTEGER DEFAULT 0,
          last_synced_at DATETIME,
          version INTEGER DEFAULT 1,
          deleted_at DATETIME,
          FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
          FOREIGN KEY (from_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
          FOREIGN KEY (to_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
          changed_at INTEGER NOT NULL -- Unix timestamp in ms
        );
      `);

      // 2. Create Indexes
      await this.db!.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_nodes_mindmap_id ON mindmap_nodes(mindmap_id);
        CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON mindmap_nodes(parent_id);
        CREATE INDEX IF NOT EXISTS idx_connections_mindmap_id ON connections(mindmap_id);
        CREATE INDEX IF NOT EXISTS idx_connections_from_node ON connections(from_node_id);
        CREATE INDEX IF NOT EXISTS idx_connections_to_node ON connections(to_node_id);
        CREATE INDEX IF NOT EXISTS idx_changes_table_record ON changes(table_name, record_id);
      `);

      // 3. Create Triggers
      // We use 'AFTER UPDATE OF' to prevent recursion.
      // The trigger ONLY fires when user-modifiable columns change.
      // It does NOT fire when 'updated_at', 'version', 'is_synced', or 'last_synced_at' change.

      // --- MindMaps Triggers ---
      await this.db!.execAsync(`
        CREATE TRIGGER IF NOT EXISTS trg_mindmaps_update_metadata
        AFTER UPDATE OF title, central_topic, summary, document_id, deleted_at ON mindmaps
        FOR EACH ROW
        WHEN NEW.last_synced_at IS OLD.last_synced_at
        BEGIN
          UPDATE mindmaps SET 
            updated_at = CURRENT_TIMESTAMP, 
            version = version + 1, 
            is_synced = 0 
          WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_mindmaps_log_insert
        AFTER INSERT ON mindmaps
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES ('mindmaps', NEW.id, 'INSERT', (strftime('%s', 'now') * 1000));
        END;

        CREATE TRIGGER IF NOT EXISTS trg_mindmaps_log_update
        AFTER UPDATE OF title, central_topic, summary, document_id, deleted_at ON mindmaps
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES (
            'mindmaps', 
            NEW.id, 
            CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
            (strftime('%s', 'now') * 1000)
          );
        END;
      `);

      // --- Nodes Triggers ---
      await this.db!.execAsync(`
        CREATE TRIGGER IF NOT EXISTS trg_mindmap_nodes_update_metadata
        AFTER UPDATE OF label, keywords, level, parent_id, position_x, position_y, notes, deleted_at ON mindmap_nodes
        FOR EACH ROW
        WHEN NEW.last_synced_at IS OLD.last_synced_at
        BEGIN
          UPDATE mindmap_nodes SET 
            updated_at = CURRENT_TIMESTAMP, 
            version = version + 1, 
            is_synced = 0 
          WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_mindmap_nodes_log_insert
        AFTER INSERT ON mindmap_nodes
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES ('mindmap_nodes', NEW.id, 'INSERT', (strftime('%s', 'now') * 1000));
        END;

        CREATE TRIGGER IF NOT EXISTS trg_mindmap_nodes_log_update
        AFTER UPDATE OF label, keywords, level, parent_id, position_x, position_y, notes, deleted_at ON mindmap_nodes
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES (
            'mindmap_nodes', 
            NEW.id, 
            CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
            (strftime('%s', 'now') * 1000)
          );
        END;
      `);

      // --- Connections Triggers ---
      await this.db!.execAsync(`
        CREATE TRIGGER IF NOT EXISTS trg_connections_update_metadata
        AFTER UPDATE OF relationship, from_node_id, to_node_id, deleted_at ON connections
        FOR EACH ROW
        WHEN NEW.last_synced_at IS OLD.last_synced_at
        BEGIN
          UPDATE connections SET 
            updated_at = CURRENT_TIMESTAMP, 
            version = version + 1, 
            is_synced = 0 
          WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_connections_log_insert
        AFTER INSERT ON connections
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES ('connections', NEW.id, 'INSERT', (strftime('%s', 'now') * 1000));
        END;

        CREATE TRIGGER IF NOT EXISTS trg_connections_log_update
        AFTER UPDATE OF relationship, from_node_id, to_node_id, deleted_at ON connections
        BEGIN
          INSERT INTO changes (table_name, record_id, operation, changed_at) 
          VALUES (
            'connections', 
            NEW.id, 
            CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
            (strftime('%s', 'now') * 1000)
          );
        END;
      `);

      // Set version to 1
      await this.db!.execAsync("PRAGMA user_version = 1");
    });
  }

  // Mind Map operations
  async createMindMap(
    mindMap: Omit<MindMapRow, "created_at" | "updated_at" | "is_synced" | "last_synced_at" | "version" | "deleted_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync("INSERT INTO mindmaps (id, title, central_topic, summary, document_id) VALUES (?, ?, ?, ?, ?)", [
      mindMap.id,
      mindMap.title,
      mindMap.central_topic ?? null,
      mindMap.summary ?? null,
      mindMap.document_id ?? null,
    ]);
    return mindMap.id;
  }

  async getMindMap(id: string): Promise<MindMapRow | null> {
    const db = await this.initialize();
    return await db.getFirstAsync<MindMapRow>(
      "SELECT * FROM mindmaps WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
  }

  async getAllMindMaps(): Promise<MindMapRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<MindMapRow>(
      "SELECT * FROM mindmaps WHERE deleted_at IS NULL ORDER BY updated_at DESC"
    );
  }

  async updateMindMap(
    id: string,
    updates: Partial<Pick<MindMapRow, "title" | "central_topic" | "summary" | "document_id">>
  ): Promise<void> {
    const db = await this.initialize();
    const setParts: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      setParts.push("title = ?");
      values.push(updates.title);
    }
    if (updates.central_topic !== undefined) {
      setParts.push("central_topic = ?");
      values.push(updates.central_topic);
    }
    if (updates.summary !== undefined) {
      setParts.push("summary = ?");
      values.push(updates.summary);
    }
    if (updates.document_id !== undefined) {
      setParts.push("document_id = ?");
      values.push(updates.document_id);
    }

    if (setParts.length === 0) return;

    values.push(id);
    const query = `UPDATE mindmaps SET ${setParts.join(", ")} WHERE id = ?`;
    await db.runAsync(query, values);
  }

  async deleteMindMap(id: string): Promise<void> {
    const db = await this.initialize();

    await db.withTransactionAsync(async () => {
      // Cascade soft delete: MindMap -> Nodes -> Connections
      await db.runAsync("UPDATE mindmaps SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
      await db.runAsync("UPDATE mindmap_nodes SET deleted_at = CURRENT_TIMESTAMP WHERE mindmap_id = ?", [id]);
      await db.runAsync("UPDATE connections SET deleted_at = CURRENT_TIMESTAMP WHERE mindmap_id = ?", [id]);
    });
  }

  // Node operations
  async createNode(
    node: Omit<MindMapNodeRow, "created_at" | "updated_at" | "is_synced" | "last_synced_at" | "version" | "deleted_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync(
      "INSERT INTO mindmap_nodes (id, mindmap_id, label, keywords, level, parent_id, position_x, position_y, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        node.id,
        node.mindmap_id,
        node.label,
        node.keywords ?? null,
        node.level,
        node.parent_id ?? null,
        node.position_x,
        node.position_y,
        node.notes ?? null,
      ]
    );
    return node.id;
  }

  async getNodesForMindMap(mindMapId: string): Promise<MindMapNodeRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<MindMapNodeRow>(
      "SELECT * FROM mindmap_nodes WHERE mindmap_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
      [mindMapId]
    );
  }

  async updateNode(
    id: string,
    updates: Partial<
      Pick<MindMapNodeRow, "label" | "position_x" | "position_y" | "notes" | "keywords" | "level" | "parent_id">
    >
  ): Promise<void> {
    const db = await this.initialize();
    const setParts: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.label !== undefined) {
      setParts.push("label = ?");
      values.push(updates.label);
    }
    if (updates.position_x !== undefined) {
      setParts.push("position_x = ?");
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      setParts.push("position_y = ?");
      values.push(updates.position_y);
    }
    if (updates.notes !== undefined) {
      setParts.push("notes = ?");
      values.push(updates.notes ?? null);
    }
    if (updates.keywords !== undefined) {
      setParts.push("keywords = ?");
      values.push(updates.keywords ?? null);
    }
    if (updates.level !== undefined) {
      setParts.push("level = ?");
      values.push(updates.level);
    }
    if (updates.parent_id !== undefined) {
      setParts.push("parent_id = ?");
      values.push(updates.parent_id ?? null);
    }

    if (setParts.length === 0) return;

    values.push(id);
    const query = `UPDATE mindmap_nodes SET ${setParts.join(", ")} WHERE id = ?`;
    await db.runAsync(query, values);
  }

  async deleteNode(id: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync("UPDATE mindmap_nodes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  }

  // Connection operations
  async createConnection(
    connection: Omit<ConnectionRow, "created_at" | "updated_at" | "is_synced" | "last_synced_at" | "version" | "deleted_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync(
      "INSERT INTO connections (id, mindmap_id, from_node_id, to_node_id, relationship) VALUES (?, ?, ?, ?, ?)",
      [
        connection.id,
        connection.mindmap_id,
        connection.from_node_id,
        connection.to_node_id,
        connection.relationship ?? null,
      ]
    );
    return connection.id;
  }

  async getConnectionsForMindMap(mindMapId: string): Promise<ConnectionRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<ConnectionRow>(
      "SELECT * FROM connections WHERE mindmap_id = ? AND deleted_at IS NULL",
      [mindMapId]
    );
  }

  async deleteConnection(id: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync("UPDATE connections SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  }

  async deleteConnectionsForNode(nodeId: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync(
      "UPDATE connections SET deleted_at = CURRENT_TIMESTAMP WHERE from_node_id = ? OR to_node_id = ?",
      [nodeId, nodeId]
    );
  }

  // Utility operations
  async getFullMindMap(id: string): Promise<{
    mindMap: MindMapRow;
    nodes: MindMapNodeRow[];
    connections: ConnectionRow[];
  } | null> {
    const mindMap = await this.getMindMap(id);
    if (!mindMap) return null;

    const [nodes, connections] = await Promise.all([
      this.getNodesForMindMap(id),
      this.getConnectionsForMindMap(id),
    ]);

    return { mindMap, nodes, connections };
  }

  // Sync Helpers
  async getPendingChanges(): Promise<ChangeRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<ChangeRow>(
      "SELECT * FROM changes ORDER BY changed_at ASC"
    );
  }

  async markAsSynced(changes: ChangeRow[]): Promise<void> {
    const db = await this.initialize();
    if (changes.length === 0) return;

    await db.withTransactionAsync(async () => {
      // 1. Remove processed changes using parameterized queries to prevent SQL injection
      for (const change of changes) {
        await db.runAsync("DELETE FROM changes WHERE id = ?", [change.id]);
      }

      // 2. Update last_synced_at for affected records
      // Group by table to optimize
      const tables = [...new Set(changes.map(c => c.table_name))];

      for (const table of tables) {
        const recordIds = changes
          .filter(c => c.table_name === table)
          .map(c => c.record_id);

        // Update each record individually using parameterized queries
        for (const recordId of recordIds) {
          await db.runAsync(
            `UPDATE ${table} SET last_synced_at = CURRENT_TIMESTAMP, is_synced = 1 WHERE id = ?`,
            [recordId]
          );
        }
      }
    });
  }

  // Cleanup operations
  async cleanupDeletedRecords(): Promise<void> {
    const db = await this.initialize();
    // Hard delete records soft-deleted more than 30 days ago AND already synced
    // This prevents data loss if device is offline for extended periods
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM mindmaps WHERE deleted_at < datetime('now', '-30 days') AND is_synced = 1"
      );
      await db.runAsync(
        "DELETE FROM mindmap_nodes WHERE deleted_at < datetime('now', '-30 days') AND is_synced = 1"
      );
      await db.runAsync(
        "DELETE FROM connections WHERE deleted_at < datetime('now', '-30 days') AND is_synced = 1"
      );
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();
