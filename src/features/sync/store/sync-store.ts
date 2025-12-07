import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ConflictItem {
  id: string;
  table: string;
  localVersion: number;
  remoteVersion: number;
  localTitle?: string;
  remoteTitle?: string;
  localUpdatedAt?: number;
  remoteUpdatedAt?: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
}

interface SyncState {
  // Network state
  isOnline: boolean;

  // Sync state
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  syncError: string | null;

  // Conflict state
  conflictItems: ConflictItem[];
  showConflictModal: boolean;

  // Actions
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setPendingChanges: (count: number) => void;
  setSyncResult: (result: SyncResult) => void;
  setSyncError: (error: string | null) => void;
  setConflictItems: (items: ConflictItem[]) => void;
  setShowConflictModal: (show: boolean) => void;
  resolveConflict: (id: string) => void;
  clearConflicts: () => void;
  reset: () => void;
}

const initialState = {
  isOnline: true,
  isSyncing: false,
  pendingChanges: 0,
  lastSyncAt: null,
  lastSyncResult: null,
  syncError: null,
  conflictItems: [] as ConflictItem[],
  showConflictModal: false,
};

export const useSyncStore = create<SyncState>()(
  devtools(
    (set) => ({
      ...initialState,

      setOnline: (isOnline) => set({ isOnline }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      setPendingChanges: (pendingChanges) => set({ pendingChanges }),

      setSyncResult: (result) =>
        set({
          lastSyncResult: result,
          lastSyncAt: new Date(),
          syncError: result.success ? null : "Sync failed",
          conflictItems: result.conflicts,
          showConflictModal: result.conflicts.length > 0,
        }),

      setSyncError: (syncError) => set({ syncError }),

      setConflictItems: (conflictItems) => set({ conflictItems }),

      setShowConflictModal: (showConflictModal) => set({ showConflictModal }),

      resolveConflict: (id) =>
        set((state) => ({
          conflictItems: state.conflictItems.filter((c) => c.id !== id),
          showConflictModal:
            state.conflictItems.filter((c) => c.id !== id).length > 0,
        })),

      clearConflicts: () =>
        set({ conflictItems: [], showConflictModal: false }),

      reset: () => set(initialState),
    }),
    { name: "SyncStore" }
  )
);

// Selectors for optimized re-renders
export const selectIsOnline = (state: SyncState) => state.isOnline;
export const selectIsSyncing = (state: SyncState) => state.isSyncing;
export const selectPendingChanges = (state: SyncState) => state.pendingChanges;
export const selectLastSyncAt = (state: SyncState) => state.lastSyncAt;
export const selectLastSyncResult = (state: SyncState) => state.lastSyncResult;
export const selectSyncError = (state: SyncState) => state.syncError;
export const selectConflictItems = (state: SyncState) => state.conflictItems;
export const selectShowConflictModal = (state: SyncState) =>
  state.showConflictModal;
