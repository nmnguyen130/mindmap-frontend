import { useTheme } from "@/components/providers/theme-provider";
import Modal from "@/components/ui/modal/modal";
import { mindmapQueries } from "@/database";
import { syncService } from "@/features/sync/services/sync-service";
import {
  selectConflictItems,
  selectShowConflictModal,
  useSyncStore,
  type ConflictItem,
} from "@/features/sync/store/sync-store";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface ConflictCardProps {
  conflict: ConflictItem;
  onKeepLocal: () => void;
  onUseRemote: () => void;
}

const ConflictCard: React.FC<ConflictCardProps> = ({
  conflict,
  onKeepLocal,
  onUseRemote,
}) => {
  const { colors } = useTheme();

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <View
      className="rounded-2xl p-4 mb-3 border"
      style={{
        backgroundColor: colors.muted + "20",
        borderColor: colors.border,
      }}
    >
      {/* Conflict Header */}
      <View className="flex-row items-center mb-3">
        <MaterialIcons name="warning" size={20} color="#f59e0b" />
        <Text
          className="ml-2 font-semibold text-base"
          style={{ color: colors.foreground }}
        >
          Mindmap Conflict
        </Text>
      </View>

      {/* Version Comparison */}
      <View className="flex-row mb-4">
        {/* Local Version */}
        <View className="flex-1 mr-2">
          <Text
            className="text-xs font-medium mb-1"
            style={{ color: colors.mutedForeground }}
          >
            📱 Local Version
          </Text>
          <Text
            className="font-medium"
            style={{ color: colors.foreground }}
            numberOfLines={2}
          >
            {conflict.localTitle || "Untitled"}
          </Text>
          <Text
            className="text-xs mt-1"
            style={{ color: colors.mutedForeground }}
          >
            v{conflict.localVersion} • {formatTime(conflict.localUpdatedAt)}
          </Text>
        </View>

        {/* Remote Version */}
        <View className="flex-1 ml-2">
          <Text
            className="text-xs font-medium mb-1"
            style={{ color: colors.mutedForeground }}
          >
            ☁️ Remote Version
          </Text>
          <Text
            className="font-medium"
            style={{ color: colors.foreground }}
            numberOfLines={2}
          >
            {conflict.remoteTitle || "Untitled"}
          </Text>
          <Text
            className="text-xs mt-1"
            style={{ color: colors.mutedForeground }}
          >
            v{conflict.remoteVersion} • {formatTime(conflict.remoteUpdatedAt)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={onKeepLocal}
          className="flex-1 py-3 rounded-xl items-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="font-semibold text-white">Keep Local</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onUseRemote}
          className="flex-1 py-3 rounded-xl items-center border"
          style={{ borderColor: colors.border }}
        >
          <Text className="font-semibold" style={{ color: colors.foreground }}>
            Use Remote
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export function ConflictModal() {
  const { colors } = useTheme();
  const conflicts = useSyncStore(selectConflictItems);
  const showModal = useSyncStore(selectShowConflictModal);
  const resolveConflict = useSyncStore((state) => state.resolveConflict);
  const setShowConflictModal = useSyncStore(
    (state) => state.setShowConflictModal
  );
  const clearConflicts = useSyncStore((state) => state.clearConflicts);
  const queryClient = useQueryClient();

  const handleKeepLocal = useCallback(
    async (conflict: ConflictItem) => {
      // Keep local version - increment local version and mark for sync
      // This will cause it to push to remote on next sync
      await mindmapQueries.update(conflict.id, {});
      resolveConflict(conflict.id);
      queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
    },
    [resolveConflict, queryClient]
  );

  const handleUseRemote = useCallback(
    async (conflict: ConflictItem) => {
      // Use remote version - trigger a re-pull for this specific mindmap
      try {
        // Resolve the conflict first and let next sync handle it
        // The local will accept remote version since we're resolving the conflict
        resolveConflict(conflict.id);
        // Trigger a re-sync to pull remote changes
        // syncService.sync() uses fetchWithAuth internally for authentication
        await syncService.sync();
        queryClient.invalidateQueries({ queryKey: ["mindmaps"] });
      } catch (error) {
        console.error("[ConflictModal] Error using remote:", error);
      }
    },
    [resolveConflict, queryClient]
  );

  const handleClose = useCallback(() => {
    setShowConflictModal(false);
  }, [setShowConflictModal]);

  const handleResolveAll = useCallback(() => {
    clearConflicts();
  }, [clearConflicts]);

  if (conflicts.length === 0) return null;

  return (
    <Modal
      visible={showModal}
      onClose={handleClose}
      title="Sync Conflicts"
      size="lg"
    >
      <ScrollView className="p-4 max-h-96">
        {/* Info Banner */}
        <View
          className="flex-row items-center p-3 rounded-xl mb-4"
          style={{ backgroundColor: "#fef3c7" }}
        >
          <MaterialIcons name="info" size={18} color="#92400e" />
          <Text className="ml-2 flex-1 text-sm" style={{ color: "#92400e" }}>
            These mindmaps were modified both locally and remotely. Choose which
            version to keep.
          </Text>
        </View>

        {/* Conflict List */}
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            onKeepLocal={() => handleKeepLocal(conflict)}
            onUseRemote={() => handleUseRemote(conflict)}
          />
        ))}
      </ScrollView>

      {/* Footer */}
      <View className="p-4 border-t" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={handleResolveAll}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: colors.muted + "40" }}
        >
          <Text
            className="font-medium"
            style={{ color: colors.mutedForeground }}
          >
            Dismiss All (Keep Local)
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
