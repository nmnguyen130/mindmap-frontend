export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS mindmaps (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    central_topic TEXT,
    summary TEXT,
    document_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    is_synced INTEGER DEFAULT 0,
    last_synced_at INTEGER,
    version INTEGER DEFAULT 1,
    deleted_at INTEGER,
    CHECK (is_synced IN (0, 1))
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
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    is_synced INTEGER DEFAULT 0,
    last_synced_at INTEGER,
    version INTEGER DEFAULT 1,
    deleted_at INTEGER,
    CHECK (is_synced IN (0, 1)),
    CHECK (level >= 0),
    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES mindmap_nodes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    mindmap_id TEXT NOT NULL,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    relationship TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    is_synced INTEGER DEFAULT 0,
    last_synced_at INTEGER,
    version INTEGER DEFAULT 1,
    deleted_at INTEGER,
    CHECK (is_synced IN (0, 1)),
    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (from_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS changes (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    synced INTEGER DEFAULT 0 CHECK(synced IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
`;

export const CREATE_INDEXES = `
  -- Active records (partial index for WHERE deleted_at IS NULL queries)
  CREATE INDEX IF NOT EXISTS idx_mindmaps_active ON mindmaps(id) WHERE deleted_at IS NULL;

  -- Foreign key lookups with soft delete filter
  CREATE INDEX IF NOT EXISTS idx_nodes_mindmap ON mindmap_nodes(mindmap_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_connections_mindmap ON connections(mindmap_id) WHERE deleted_at IS NULL;

  -- Tree traversal for mindmap rendering
  CREATE INDEX IF NOT EXISTS idx_nodes_parent ON mindmap_nodes(parent_id) WHERE parent_id IS NOT NULL;

  -- Sync up: pending changes queue
  CREATE INDEX IF NOT EXISTS idx_changes_pending ON changes(synced, changed_at) WHERE synced = 0;

  -- Sync down: pull records updated after last sync
  CREATE INDEX IF NOT EXISTS idx_mindmaps_updated ON mindmaps(updated_at);
  CREATE INDEX IF NOT EXISTS idx_nodes_updated ON mindmap_nodes(updated_at);
  CREATE INDEX IF NOT EXISTS idx_connections_updated ON connections(updated_at);
`;

export const CREATE_TRIGGERS = `
  -- INSERT: Log new records
  CREATE TRIGGER IF NOT EXISTS trg_mindmaps_insert
  AFTER INSERT ON mindmaps
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (hex(randomblob(8)), 'mindmaps', NEW.id, 'INSERT', (strftime('%s','now') * 1000));
  END;

  CREATE TRIGGER IF NOT EXISTS trg_nodes_insert
  AFTER INSERT ON mindmap_nodes
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (hex(randomblob(8)), 'mindmap_nodes', NEW.id, 'INSERT', (strftime('%s','now') * 1000));
  END;

  CREATE TRIGGER IF NOT EXISTS trg_connections_insert
  AFTER INSERT ON connections
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (hex(randomblob(8)), 'connections', NEW.id, 'INSERT', (strftime('%s','now') * 1000));
  END;

  -- UPDATE: Log changes (metadata must be set in app code)
  CREATE TRIGGER IF NOT EXISTS trg_mindmaps_after_update
  AFTER UPDATE OF title, central_topic, summary, document_id, deleted_at ON mindmaps
  FOR EACH ROW WHEN NEW.last_synced_at IS OLD.last_synced_at
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (
      hex(randomblob(8)),
      'mindmaps',
      NEW.id,
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
      (strftime('%s','now') * 1000)
    );
  END;

  CREATE TRIGGER IF NOT EXISTS trg_nodes_after_update
  AFTER UPDATE OF label, keywords, level, parent_id, position_x, position_y, notes, deleted_at ON mindmap_nodes
  FOR EACH ROW WHEN NEW.last_synced_at IS OLD.last_synced_at
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (
      hex(randomblob(8)),
      'mindmap_nodes',
      NEW.id,
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
      (strftime('%s','now') * 1000)
    );
  END;

  CREATE TRIGGER IF NOT EXISTS trg_connections_after_update
  AFTER UPDATE OF relationship, from_node_id, to_node_id, deleted_at ON connections
  FOR EACH ROW WHEN NEW.last_synced_at IS OLD.last_synced_at
  BEGIN
    INSERT INTO changes (id, table_name, record_id, operation, changed_at)
    VALUES (
      hex(randomblob(8)),
      'connections',
      NEW.id,
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
      (strftime('%s','now') * 1000)
    );
  END;

  -- CASCADE: Soft delete children when parent mindmap is deleted
  CREATE TRIGGER IF NOT EXISTS trg_mindmaps_cascade_soft_delete
  AFTER UPDATE OF deleted_at ON mindmaps
  FOR EACH ROW WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
  BEGIN
    UPDATE mindmap_nodes
    SET deleted_at = NEW.deleted_at,
        updated_at = (strftime('%s','now') * 1000),
        is_synced = 0
    WHERE mindmap_id = NEW.id AND deleted_at IS NULL;

    UPDATE connections
    SET deleted_at = NEW.deleted_at,
        updated_at = (strftime('%s','now') * 1000),
        is_synced = 0
    WHERE mindmap_id = NEW.id AND deleted_at IS NULL;
  END;
`;
