# Sync & Database Architecture

## Overview

This document explains the offline-first data architecture with background sync.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                            │
│                 useMindmaps() │ useMindmap(id)                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TanStack Query                               │
│  • Caches query results in memory                                   │
│  • Handles loading/error states                                     │
│  • Auto-refetches on window focus                                   │
│  • Invalidates cache after mutations                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ queryFn calls
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Database Queries                               │
│  mindmapQueries │ nodeQueries │ connectionQueries │ changeQueries   │
│  📁 src/shared/database/queries/                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SQLite (expo-sqlite)                             │
│  ★ PRIMARY DATA SOURCE - works 100% offline                        │
│                                                                     │
│  Tables:                                                            │
│  ├── mindmaps          (id, title, central_topic, summary, ...)    │
│  ├── mindmap_nodes     (id, mindmap_id, label, position, ...)      │
│  ├── connections       (id, from_node_id, to_node_id, ...)         │
│  ├── changes           (id, table_name, operation, synced)  ◀── LOG│
│  └── settings          (key, value)                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
┌──────────────────────────┐         ┌────────────────────────────────┐
│    Triggers (SQLite)     │         │       SyncProvider             │
│                          │         │                                │
│  AFTER INSERT/UPDATE:    │         │  📁 src/features/sync/         │
│  → INSERT INTO changes   │────────▶│  • Reads pending changes       │
│                          │         │  • Pushes to Backend API       │
│  Auto-logs all changes   │         │  • Pulls from Backend API      │
│  for sync later          │         │  • Marks as synced             │
└──────────────────────────┘         └─────────────┬──────────────────┘
                                                   │
                                                   ▼
                                     ┌────────────────────────────────┐
                                     │        Backend API             │
                                     │   (Express + MongoDB)          │
                                     │                                │
                                     │  POST /api/mindmaps            │
                                     │  PUT  /api/mindmaps/:id        │
                                     │  GET  /api/mindmaps?since=     │
                                     │  DELETE /api/mindmaps/:id      │
                                     └────────────────────────────────┘
```

---

## Data Flow

### 1. Reading Data (Offline-First)

```
User opens Home Screen
    │
    ▼
useMindmaps() hook
    │
    ├─▶ Check TanStack Query cache
    │       └─▶ If fresh → return cached data (instant!)
    │
    └─▶ If stale/empty → call mindmapQueries.getAll()
            │
            └─▶ SELECT * FROM mindmaps (SQLite)
                    │
                    └─▶ Return to UI ✅
```

### 2. Writing Data (Optimistic + Async Sync)

```
User creates mindmap
    │
    ▼
useCreateMindmap().mutate(data)
    │
    ├─▶ 1. INSERT INTO mindmaps (SQLite)
    │       └─▶ Trigger: INSERT INTO changes (logs for sync)
    │
    ├─▶ 2. invalidateQueries(['mindmaps'])
    │       └─▶ TanStack refetches list
    │
    └─▶ 3. UI updates immediately ✅

Later (background):
    │
    ▼
SyncProvider detects pending changes
    │
    ├─▶ POST /api/mindmaps (Backend)
    │
    └─▶ DELETE FROM changes WHERE id = ? (mark synced)
```

### 3. Sync Flow (Background)

```
App becomes online / foreground
    │
    ▼
SyncProvider.performSync()
    │
    ├─▶ PUSH: Get pending changes from `changes` table
    │       │
    │       ├─▶ For each: POST/PUT to Backend
    │       │
    │       └─▶ Mark as synced
    │
    ├─▶ PULL: GET /api/mindmaps?since=lastSyncTimestamp
    │       │
    │       ├─▶ For each remote mindmap:
    │       │       ├─▶ Not in local → INSERT
    │       │       └─▶ Remote newer → UPDATE
    │       │
    │       └─▶ Save new lastSyncTimestamp
    │
    └─▶ queryClient.invalidateQueries()
            └─▶ UI refreshes with synced data
```

---

## File Structure

```
src/
├── shared/database/
│   ├── client.ts          # getDB() - SQLite connection
│   ├── schema.ts          # CREATE TABLE, triggers, indexes
│   ├── types.ts           # TypeScript interfaces
│   ├── index.ts           # Barrel exports
│   └── queries/
│       ├── mindmap.ts     # mindmapQueries
│       ├── node.ts        # nodeQueries
│       ├── connection.ts  # connectionQueries
│       └── change.ts      # changeQueries (sync log)
│
├── features/mindmap/
│   ├── hooks/
│   │   ├── use-mindmaps.ts  # TanStack Query hooks ⭐
│   │   └── index.ts
│   └── store/
│       ├── mindmap-ui-store.ts  # Zustand UI state only
│       └── mindmap-store.ts     # DEPRECATED (old approach)
│
└── features/sync/
    ├── providers/
    │   ├── sync-provider.tsx     # Background sync logic
    │   └── authenticated-sync-wrapper.tsx
    ├── services/
    │   └── sync-service.ts       # Push/pull implementation
    └── store/
        └── sync-store.ts         # Sync state (isOnline, isSyncing)
```

---

## Key Concepts

### Why SQLite-First?

| Approach         | Pros                       | Cons                                     |
| ---------------- | -------------------------- | ---------------------------------------- |
| Backend-First    | Always fresh               | Slow, requires network, unusable offline |
| **SQLite-First** | **Instant, works offline** | Needs sync logic                         |

### Why TanStack Query?

- **Caching**: Same query returns instant cached result
- **Auto-refetch**: Refreshes on window focus, network restore
- **Loading states**: `isLoading`, `error` built-in
- **Mutations**: Optimistic updates, rollback on error

### Why Separate Zustand UI Store?

Before (bad):

```typescript
// Loaded ALL mindmaps into memory → LAG!
const maps = useMindMapStore((state) => state.maps);
```

After (good):

```typescript
// Only current UI state
const currentMapId = useMindmapUI((state) => state.currentMapId);
// Data from TanStack Query (cached, lazy-loaded)
const { data: map } = useMindmap(currentMapId);
```

---

## Backend API Contract

### Endpoints

| Method | URL                               | Description                 |
| ------ | --------------------------------- | --------------------------- |
| GET    | `/api/mindmaps`                   | List all for user           |
| GET    | `/api/mindmaps?since=<timestamp>` | Get updated after timestamp |
| GET    | `/api/mindmaps/:id`               | Get full mindmap with nodes |
| POST   | `/api/mindmaps`                   | Create new                  |
| PUT    | `/api/mindmaps/:id`               | Update existing             |
| DELETE | `/api/mindmaps/:id`               | Soft delete                 |

### Mindmap JSON Structure

```json
{
  "id": "uuid",
  "title": "My Mindmap",
  "central_topic": "Main Topic",
  "summary": "Description",
  "version": 3,
  "nodes": [
    {
      "id": "node-1",
      "label": "Node A",
      "level": 0,
      "position": { "x": 0, "y": 0 },
      "keywords": ["tag1", "tag2"]
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "from": "node-1",
      "to": "node-2"
    }
  ]
}
```

---

## Conflict Resolution

### Strategy: Last-Write-Wins (LWW) + User-Facing Conflict UI

```
Local version: 3, Remote version: 4
    └─▶ Remote wins → Update local automatically

Local version: 3 (modified), Remote version: 3
    └─▶ Conflict detected → Show ConflictModal to user
                            └─▶ User chooses: "Keep Local" or "Use Remote"
```

### Conflict UI Flow

```
Sync detects conflict (both local & remote modified)
    │
    ▼
SyncResult.conflicts: ConflictItem[]
    │
    ▼
useSyncStore stores conflicts + shows modal
    │
    ▼
ConflictModal renders:
  ┌──────────────────────────────────────┐
  │ ⚠ Sync Conflicts Detected            │
  │                                      │
  │ 📱 Local: "My Map v3" (5 min ago)    │
  │ ☁️ Remote: "My Map v3" (2 min ago)   │
  │                                      │
  │ [Keep Local]     [Use Remote]       │
  └──────────────────────────────────────┘
    │
    └─▶ User resolution → resolveConflict(id)
                            └─▶ Next sync applies decision
```

### ConflictItem Structure

```typescript
interface ConflictItem {
  id: string;
  table: string;
  localVersion: number;
  remoteVersion: number;
  localTitle?: string;
  remoteTitle?: string;
  localUpdatedAt?: number;
  remoteUpdatedAt?: number;
}
```

---

## Performance Optimizations

### Batch Query Loading

Instead of N database queries during sync, we batch-load all affected mindmaps:

```
Before: 5 pending mindmaps → 5 × getFull() → 15 DB queries
After:  5 pending mindmaps → 1 × getByIds() → 3 DB queries
```

```typescript
// In sync-service.ts
const mindmapIdsToSync = changes.map((c) => c.record_id);
const mindmapsToSync = await mindmapQueries.getByIds(mindmapIdsToSync);
const mindmapMap = new Map(mindmapsToSync.map((m) => [m.mindMap.id, m]));
```

---

## Troubleshooting

### Data not syncing?

1. Check `isAuthenticated` — sync only works when logged in
2. Check `isOnline` in SyncProvider
3. Check `changes` table for pending items

### Conflicts not resolving?

1. Tap the orange "⚠ conflicts" link in SyncStatus
2. Choose "Keep Local" or "Use Remote" for each conflict
3. Sync will automatically apply your decisions

### Old data showing?

```typescript
// Force refetch
queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
```

### Debug logs

```typescript
// In sync-service.ts
console.log("[Sync] Pending changes:", changes);
console.log("[Sync] Push result:", synced, failed);
console.log("[Sync] Conflicts:", conflictItems);
```
