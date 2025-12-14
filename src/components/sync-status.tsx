import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  useSyncStore,
  selectIsOnline,
  selectIsSyncing,
  selectLastSyncAt,
  selectPendingChanges,
  selectLastSyncResult,
} from "@/features/sync";
import { syncService } from "@/features/sync/services/sync-service";
import { useCallback, useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/components/providers/theme-provider";

/**
 * Compact sync status indicator for use in headers.
 * Shows a small sync icon with status indicators.
 *
 * Icons:
 * - cloud-done: Successfully synced, no pending changes
 * - cloud-queue: Has pending changes or sync in progress
 * - cloud-off: Offline or last sync failed
 */
export function SyncStatusIndicator() {
  const { colors } = useTheme();
  const isOnline = useSyncStore(selectIsOnline);
  const isSyncing = useSyncStore(selectIsSyncing);
  const pendingChanges = useSyncStore(selectPendingChanges);
  const lastSyncResult = useSyncStore(selectLastSyncResult);
  const lastSyncAt = useSyncStore(selectLastSyncAt);
  const setShowConflictModal = useSyncStore(
    (state) => state.setShowConflictModal
  );
  const setSyncing = useSyncStore((state) => state.setSyncing);
  const setSyncResult = useSyncStore((state) => state.setSyncResult);
  const setSyncError = useSyncStore((state) => state.setSyncError);

  // Track if last sync was successful (backend was reachable)
  const [lastSyncSuccess, setLastSyncSuccess] = useState<boolean | null>(null);

  const conflictCount = lastSyncResult?.conflicts?.length ?? 0;
  const failedCount = lastSyncResult?.failed ?? 0;
  const hasConflicts = conflictCount > 0;
  const hasSyncIssues = failedCount > 0 || lastSyncResult?.success === false;

  // Determine actual sync health
  const isBackendReachable = lastSyncSuccess === true && isOnline;
  const hasPendingWork = pendingChanges > 0;

  const syncNow = useCallback(async () => {
    if (isSyncing) return;

    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncService.sync();
      setSyncResult(result);
      setLastSyncSuccess(result.success);
    } catch (error) {
      console.error("[SyncStatusIndicator] Sync error:", error);
      setLastSyncSuccess(false);
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [isSyncing, setSyncing, setSyncResult, setSyncError]);

  const handlePress = useCallback(() => {
    if (hasConflicts) {
      setShowConflictModal(true);
    } else {
      syncNow();
    }
  }, [hasConflicts, setShowConflictModal, syncNow]);

  // Update lastSyncSuccess when lastSyncResult changes
  useEffect(() => {
    if (lastSyncResult) {
      setLastSyncSuccess(lastSyncResult.success);
    }
  }, [lastSyncResult]);

  // Determine icon based on status
  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    if (!isOnline) return "cloud-off";
    if (lastSyncSuccess === false) return "cloud-off"; // Backend unreachable
    if (isSyncing) return "sync";
    if (hasPendingWork) return "cloud-queue";
    if (lastSyncAt && lastSyncSuccess) return "cloud-done";
    return "cloud-queue"; // Initial state, never synced
  };

  // Determine icon color based on status
  const getStatusColor = () => {
    if (!isOnline) return colors.mutedForeground;
    if (lastSyncSuccess === false) return colors.error ?? "#ef4444";
    if (hasConflicts) return "#f59e0b"; // Orange for conflicts
    if (hasSyncIssues) return colors.error ?? "#ef4444";
    if (hasPendingWork) return colors.primary;
    if (lastSyncSuccess) return colors.success ?? "#10b981"; // Green for synced
    return colors.mutedForeground;
  };

  // Determine if we should show a badge
  const shouldShowBadge = hasConflicts || (hasPendingWork && hasSyncIssues);
  const badgeContent = hasConflicts
    ? "!"
    : pendingChanges > 9
      ? "9+"
      : String(pendingChanges);
  const badgeColor = hasConflicts || hasSyncIssues ? "#f59e0b" : colors.primary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isSyncing}
      className="w-10 h-10 rounded-full justify-center items-center"
      style={{ backgroundColor: colors.surface }}
      accessibilityLabel={
        isSyncing
          ? "Syncing"
          : !isOnline
            ? "Offline"
            : lastSyncSuccess === false
              ? "Sync failed"
              : hasConflicts
                ? `${conflictCount} sync conflicts`
                : hasPendingWork
                  ? `${pendingChanges} pending changes`
                  : "Synced"
      }
      accessibilityRole="button"
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View className="relative">
          <MaterialIcons
            name={getIconName()}
            size={22}
            color={getStatusColor()}
          />
          {/* Badge for conflicts or failed pending changes */}
          {shouldShowBadge && (
            <View
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full justify-center items-center"
              style={{ backgroundColor: badgeColor }}
            >
              <Text className="text-[8px] text-white font-bold">
                {badgeContent}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function SyncStatus() {
  const isOnline = useSyncStore(selectIsOnline);
  const isSyncing = useSyncStore(selectIsSyncing);
  const lastSyncAt = useSyncStore(selectLastSyncAt);
  const pendingChanges = useSyncStore(selectPendingChanges);
  const lastSyncResult = useSyncStore(selectLastSyncResult);
  const setShowConflictModal = useSyncStore(
    (state) => state.setShowConflictModal
  );
  const setSyncing = useSyncStore((state) => state.setSyncing);
  const setSyncResult = useSyncStore((state) => state.setSyncResult);

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setSyncing(true);
    try {
      // syncService.sync() uses fetchWithAuth internally for authentication
      const result = await syncService.sync();
      setSyncResult(result);
    } finally {
      setSyncing(false);
    }
  }, [isSyncing, isOnline, setSyncing, setSyncResult]);

  const handleConflictPress = useCallback(() => {
    setShowConflictModal(true);
  }, [setShowConflictModal]);

  const conflictCount = lastSyncResult?.conflicts?.length ?? 0;

  return (
    <View className="flex-row items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {/* Online/Offline indicator */}
      <View
        className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
      />

      {/* Sync status */}
      <View className="flex-1">
        <Text className="text-sm text-slate-700 dark:text-slate-300">
          {isSyncing
            ? "Syncing..."
            : `Last sync: ${formatLastSync(lastSyncAt)}`}
        </Text>

        {/* Sync result feedback */}
        {lastSyncResult && !isSyncing && (
          <View className="flex-row flex-wrap gap-1">
            {lastSyncResult.synced > 0 && (
              <Text className="text-xs text-green-600 dark:text-green-400">
                ✓ {lastSyncResult.synced} synced
              </Text>
            )}
            {conflictCount > 0 && (
              <TouchableOpacity onPress={handleConflictPress}>
                <Text className="text-xs text-orange-500 font-medium underline">
                  ⚠ {conflictCount} conflicts - Tap to resolve
                </Text>
              </TouchableOpacity>
            )}
            {lastSyncResult.failed > 0 && (
              <Text className="text-xs text-red-500">
                ✗ {lastSyncResult.failed} failed
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Pending changes badge */}
      {pendingChanges > 0 && (
        <View className="px-2 py-1 bg-orange-500 rounded-full">
          <Text className="text-xs text-white font-semibold">
            {pendingChanges} pending
          </Text>
        </View>
      )}

      {/* Manual sync button */}
      <TouchableOpacity
        onPress={syncNow}
        disabled={isSyncing || !isOnline}
        className={`px-3 py-1.5 rounded-md flex-row items-center gap-1 ${
          isSyncing || !isOnline
            ? "bg-slate-300 dark:bg-slate-700"
            : "bg-blue-500"
        }`}
      >
        {isSyncing && <ActivityIndicator size="small" color="white" />}
        <Text
          className={`text-sm font-medium ${
            isSyncing || !isOnline
              ? "text-slate-500 dark:text-slate-400"
              : "text-white"
          }`}
        >
          Sync
        </Text>
      </TouchableOpacity>
    </View>
  );
}
