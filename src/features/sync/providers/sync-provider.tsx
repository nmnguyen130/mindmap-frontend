import React, { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

import { useSyncStore } from "../store/sync-store";
import { syncService } from "../services/sync-service";
import {
  useAuthStore,
  selectAccessToken,
} from "@/features/auth/store/auth-store";
import { ConflictModal } from "@/components/sync/conflict-modal";

interface SyncProviderProps {
  children: React.ReactNode;
  autoSyncInterval?: number; // ms, default 60s
}

/**
 * SyncProvider manages the sync lifecycle:
 * - Listens for network status changes
 * - Listens for app state changes (background/foreground)
 * - Auto-syncs at regular intervals
 * - Syncs on network restore
 *
 * Only mounts when user is authenticated (via AuthenticatedSyncWrapper)
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  autoSyncInterval = 60000,
}) => {
  const accessToken = useAuthStore(selectAccessToken);
  const setOnline = useSyncStore((state) => state.setOnline);
  const setSyncing = useSyncStore((state) => state.setSyncing);
  const setPendingChanges = useSyncStore((state) => state.setPendingChanges);
  const setSyncResult = useSyncStore((state) => state.setSyncResult);
  const setSyncError = useSyncStore((state) => state.setSyncError);
  const reset = useSyncStore((state) => state.reset);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Perform sync with error handling
  const performSync = useCallback(async () => {
    if (!accessToken) return;

    const isOnlineNow = useSyncStore.getState().isOnline;
    const isSyncingNow = useSyncStore.getState().isSyncing;

    if (!isOnlineNow || isSyncingNow) return;

    setSyncing(true);
    try {
      const result = await syncService.sync(accessToken);
      if (isMountedRef.current) {
        setSyncResult(result);
        // Update pending changes count
        const count = await syncService.getPendingChangesCount();
        setPendingChanges(count);
      }
    } catch (error) {
      if (isMountedRef.current) {
        const message = error instanceof Error ? error.message : "Sync failed";
        setSyncError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [accessToken, setSyncing, setSyncResult, setSyncError, setPendingChanges]);

  // Setup network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected ?? false;
      const wasOffline = !useSyncStore.getState().isOnline;

      setOnline(isOnline);
      onlineManager.setOnline(isOnline); // TanStack Query integration

      // Auto-sync when coming back online
      if (wasOffline && isOnline) {
        void performSync();
      }
    });

    return () => unsubscribe();
  }, [setOnline, performSync]);

  // Setup app state listener (sync on foreground)
  useEffect(() => {
    const handleAppStateChange = (status: AppStateStatus) => {
      if (status === "active") {
        void performSync();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [performSync]);

  // Setup auto-sync interval
  useEffect(() => {
    // Initial sync
    void performSync();

    // Periodic sync
    syncIntervalRef.current = setInterval(() => {
      void performSync();
    }, autoSyncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [performSync, autoSyncInterval]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      reset();
    };
  }, [reset]);

  return (
    <>
      {children}
      <ConflictModal />
    </>
  );
};
