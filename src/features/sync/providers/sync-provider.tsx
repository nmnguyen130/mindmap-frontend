import React, { useEffect, useRef } from "react";

import { SyncController } from "../services/sync-controller";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { ConflictModal } from "@/components/ui/modal/conflict-modal";

interface SyncProviderProps {
  children: React.ReactNode;
  autoSyncInterval?: number; // ms, default 60s
}

/**
 * SyncProvider manages the sync lifecycle via SyncController.
 * Only mounts when user is authenticated (via AuthenticatedSyncWrapper)
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  autoSyncInterval = 60000,
}) => {
  const controllerRef = useRef<SyncController | null>(null);
  const intervalRef = useRef(autoSyncInterval);

  // Update interval on existing controller (no recreation)
  useEffect(() => {
    intervalRef.current = autoSyncInterval;
    controllerRef.current?.updateInterval(autoSyncInterval);
  }, [autoSyncInterval]);

  // Create controller once on mount
  useEffect(() => {
    const controller = new SyncController({
      autoSyncIntervalMs: intervalRef.current,
      getAccessToken: () => useAuthStore.getState().accessToken,
    });

    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, []); // Empty deps = mount only

  return (
    <>
      {children}
      <ConflictModal />
    </>
  );
};
