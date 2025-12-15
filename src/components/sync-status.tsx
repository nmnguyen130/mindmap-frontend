import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  useSyncStore,
  selectIsOnline,
  selectIsSyncing,
  selectPendingChanges,
} from "@/features/sync";
import { syncService } from "@/features/sync/services/sync-service";
import { useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/components/providers/theme-provider";

/**
 * Minimal sync status indicator for headers.
 * - Tap to sync
 * - Shows: syncing spinner | cloud-done (synced) | cloud-off (offline)
 * - Badge: pending changes count
 */
export function SyncStatusIndicator() {
  const { colors } = useTheme();
  const isOnline = useSyncStore(selectIsOnline);
  const isSyncing = useSyncStore(selectIsSyncing);
  const pendingChanges = useSyncStore(selectPendingChanges);
  const setSyncing = useSyncStore((state) => state.setSyncing);
  const setSyncResult = useSyncStore((state) => state.setSyncResult);
  const setSyncError = useSyncStore((state) => state.setSyncError);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncService.sync();
      setSyncResult(result);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [isSyncing, isOnline, setSyncing, setSyncResult, setSyncError]);

  // Simple icon logic
  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    if (!isOnline) return "cloud-off";
    if (pendingChanges > 0) return "cloud-upload";
    return "cloud-done";
  };

  // Simple color logic
  const getIconColor = () => {
    if (!isOnline) return colors.mutedForeground;
    if (pendingChanges > 0) return colors.primary;
    return colors.success ?? "#10b981";
  };

  return (
    <TouchableOpacity
      onPress={syncNow}
      disabled={isSyncing || !isOnline}
      className="w-10 h-10 rounded-full justify-center items-center"
      style={{ backgroundColor: colors.surface }}
      accessibilityLabel={
        isSyncing
          ? "Syncing"
          : !isOnline
            ? "Offline"
            : pendingChanges > 0
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
            color={getIconColor()}
          />
          {/* Badge for pending changes */}
          {pendingChanges > 0 && (
            <View
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full justify-center items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-[8px] text-white font-bold">
                {pendingChanges > 9 ? "9+" : pendingChanges}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
