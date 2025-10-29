import * as SQLite from "expo-sqlite";

export interface MindMapRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MindMapNodeRow {
  id: string;
  mindmap_id: string;
  text: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface ConnectionRow {
  id: string;
  mindmap_id: string;
  from_node_id: string;
  to_node_id: string;
  created_at: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    try {
      this.db = await SQLite.openDatabaseAsync("mindmap.db");
      await this.db.execAsync("PRAGMA journal_mode = WAL;");
      await this.db.execAsync("PRAGMA foreign_keys = ON;"); // Enable foreign key constraints for CASCADE to work

      await this.createTables();
      await this.runMigrations();
      return this.db;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS mindmaps (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mindmap_nodes (
        id TEXT PRIMARY KEY,
        mindmap_id TEXT NOT NULL,
        text TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        mindmap_id TEXT NOT NULL,
        from_node_id TEXT NOT NULL,
        to_node_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
        FOREIGN KEY (from_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (to_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_mindmap_id ON mindmap_nodes(mindmap_id);
      CREATE INDEX IF NOT EXISTS idx_connections_mindmap_id ON connections(mindmap_id);
      CREATE INDEX IF NOT EXISTS idx_connections_from_node ON connections(from_node_id);
      CREATE INDEX IF NOT EXISTS idx_connections_to_node ON connections(to_node_id);
    `);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Get current database version
    const result = await this.db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version"
    );

    const currentVersion = result?.user_version || 0;
    const targetVersion = 1;

    // Run migrations if needed
    for (
      let version = currentVersion + 1;
      version <= targetVersion;
      version++
    ) {
      await this.runMigration(version);
    }
  }

  private async runMigration(version: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    switch (version) {
      case 1:
        // Initial schema is already created in createTables()
        break;
      // Future migrations can be added here
    }

    // Update database version
    await this.db.execAsync(`PRAGMA user_version = ${version}`);
  }

  // Mind Map operations
  async createMindMap(
    mindMap: Omit<MindMapRow, "created_at" | "updated_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync("INSERT INTO mindmaps (id, title) VALUES (?, ?)", [
      mindMap.id,
      mindMap.title,
    ]);
    return mindMap.id; // Since ID is manually provided as PRIMARY KEY, return it directly
  }

  async getMindMap(id: string): Promise<MindMapRow | null> {
    const db = await this.initialize();
    return await db.getFirstAsync<MindMapRow>(
      "SELECT * FROM mindmaps WHERE id = ?",
      [id]
    );
  }

  async getAllMindMaps(): Promise<MindMapRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<MindMapRow>(
      "SELECT * FROM mindmaps ORDER BY updated_at DESC"
    );
  }

  async updateMindMap(
    id: string,
    updates: Partial<Pick<MindMapRow, "title">>
  ): Promise<void> {
    const db = await this.initialize();
    const setParts: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      setParts.push("title = ?");
      values.push(updates.title);
    }

    if (setParts.length === 0) return;

    setParts.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `UPDATE mindmaps SET ${setParts.join(", ")} WHERE id = ?`;
    await db.runAsync(query, values);
  }

  async deleteMindMap(id: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync("DELETE FROM mindmaps WHERE id = ?", [id]);
  }

  // Node operations
  async createNode(
    node: Omit<MindMapNodeRow, "created_at" | "updated_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync(
      "INSERT INTO mindmap_nodes (id, mindmap_id, text, position_x, position_y) VALUES (?, ?, ?, ?, ?)",
      [node.id, node.mindmap_id, node.text, node.position_x, node.position_y]
    );
    return node.id; // Since ID is manually provided as PRIMARY KEY, return it directly
  }

  async getNodesForMindMap(mindMapId: string): Promise<MindMapNodeRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<MindMapNodeRow>(
      "SELECT * FROM mindmap_nodes WHERE mindmap_id = ? ORDER BY created_at ASC",
      [mindMapId]
    );
  }

  async updateNode(
    id: string,
    updates: Partial<Pick<MindMapNodeRow, "text" | "position_x" | "position_y">>
  ): Promise<void> {
    const db = await this.initialize();
    const setParts: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.text !== undefined) {
      setParts.push("text = ?");
      values.push(updates.text);
    }
    if (updates.position_x !== undefined) {
      setParts.push("position_x = ?");
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      setParts.push("position_y = ?");
      values.push(updates.position_y);
    }

    if (setParts.length === 0) return;

    setParts.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `UPDATE mindmap_nodes SET ${setParts.join(", ")} WHERE id = ?`;
    await db.runAsync(query, values);
  }

  async deleteNode(id: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync("DELETE FROM mindmap_nodes WHERE id = ?", [id]);
  }

  // Connection operations
  async createConnection(
    connection: Omit<ConnectionRow, "created_at">
  ): Promise<string> {
    const db = await this.initialize();
    await db.runAsync(
      "INSERT INTO connections (id, mindmap_id, from_node_id, to_node_id) VALUES (?, ?, ?, ?)",
      [
        connection.id,
        connection.mindmap_id,
        connection.from_node_id,
        connection.to_node_id,
      ]
    );
    return connection.id; // Since ID is manually provided as PRIMARY KEY, return it directly
  }

  async getConnectionsForMindMap(mindMapId: string): Promise<ConnectionRow[]> {
    const db = await this.initialize();
    return await db.getAllAsync<ConnectionRow>(
      "SELECT * FROM connections WHERE mindmap_id = ?",
      [mindMapId]
    );
  }

  async deleteConnection(id: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync("DELETE FROM connections WHERE id = ?", [id]);
  }

  async deleteConnectionsForNode(nodeId: string): Promise<void> {
    const db = await this.initialize();
    await db.runAsync(
      "DELETE FROM connections WHERE from_node_id = ? OR to_node_id = ?",
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

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();
