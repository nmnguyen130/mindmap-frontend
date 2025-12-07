// Providers
export { SyncProvider } from "./providers/sync-provider";
export { AuthenticatedSyncWrapper } from "./providers/authenticated-sync-wrapper";

// Service
export { syncService } from "./services/sync-service";

// Store
export {
  useSyncStore,
  selectIsOnline,
  selectIsSyncing,
  selectPendingChanges,
  selectLastSyncAt,
  selectLastSyncResult,
  selectSyncError,
  selectConflictItems,
  selectShowConflictModal,
} from "./store/sync-store";
export type { SyncResult, ConflictItem } from "./store/sync-store";
