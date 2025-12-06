import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
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

  // Actions
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setPendingChanges: (count: number) => void;
  setSyncResult: (result: SyncResult) => void;
  setSyncError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isOnline: true,
  isSyncing: false,
  pendingChanges: 0,
  lastSyncAt: null,
  lastSyncResult: null,
  syncError: null,
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
        }),

      setSyncError: (syncError) => set({ syncError }),

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
