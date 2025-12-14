import { MaterialIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Header from "@/components/layout/header";
import { useTheme } from "@/components/providers/theme-provider";
import { useMindmaps } from "@/features/mindmap";

/**
 * Store Manager Screen
 * Developer utility for managing local mindmap database
 */
const StoreManagerScreen = () => {
  const { colors } = useTheme();
  const { mindmaps, isLoading, error, create, remove, refetch } = useMindmaps();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log("[StoreManager]", message);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  };

  const handleCreateTest = async () => {
    // Generate proper UUIDs using expo-crypto (React Native compatible)
    const id = Crypto.randomUUID();
    const node1Id = Crypto.randomUUID();
    const node2Id = Crypto.randomUUID();
    const edgeId = Crypto.randomUUID();

    addLog("Creating test mindmap...");

    try {
      await create.mutateAsync({
        id,
        title: `Test Mindmap ${new Date().toLocaleTimeString()}`,
        central_topic: "Main Topic",
        summary: "Created via Store Manager",
        nodes: [
          {
            id: node1Id,
            label: "Central Node",
            keywords: ["main"],
            level: 0,
            position: { x: 0, y: 0 },
          },
          {
            id: node2Id,
            label: "Child Node",
            keywords: ["child"],
            level: 1,
            parent_id: node1Id,
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          {
            id: edgeId,
            from: node1Id,
            to: node2Id,
          },
        ],
      });

      addLog(`✅ Created: ${id.slice(0, 8)}...`);
    } catch (err) {
      addLog(`❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Delete Mindmap", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          addLog(`Deleting: ${title}...`);
          try {
            await remove.mutateAsync(id);
            addLog(`✅ Deleted: ${id}`);
          } catch (err) {
            addLog(
              `❌ Failed: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    addLog("Refreshing...");
    await refetch();
    addLog(`✅ Loaded ${mindmaps.length} mindmaps`);
  };

  const isBusy = isLoading || create.isPending || remove.isPending;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Store Manager"
        showBackButton
        onBackPress={() => router.back()}
        onMenuPress={() => {}}
      />

      {/* Stats Bar */}
      <View
        className="px-4 py-2 flex-row items-center justify-between border-b"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <View className="flex-row items-center gap-2">
          {isBusy && <ActivityIndicator size="small" color={colors.primary} />}
          <Text style={{ color: colors.foreground }}>
            {mindmaps.length} mindmaps
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          disabled={isBusy}
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text style={{ color: colors.secondaryForeground, fontSize: 12 }}>
            Refresh
          </Text>
        </Pressable>
      </View>

      {/* Error Display */}
      {error && (
        <View className="mx-4 mt-2 p-3 rounded-lg bg-red-100">
          <Text className="text-red-800 text-sm">
            {error instanceof Error ? error.message : "An error occurred"}
          </Text>
        </View>
      )}

      {/* Mindmap List */}
      <ScrollView className="flex-1 p-4">
        <Text
          className="text-xs font-semibold uppercase mb-2"
          style={{ color: colors.mutedForeground }}
        >
          Mindmaps
        </Text>

        {mindmaps.length === 0 ? (
          <View
            className="p-4 rounded-xl items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <MaterialIcons
              name="folder-open"
              size={32}
              color={colors.mutedForeground}
            />
            <Text className="mt-2" style={{ color: colors.mutedForeground }}>
              No mindmaps found
            </Text>
          </View>
        ) : (
          mindmaps.map((map) => (
            <View
              key={map.id}
              className="p-3 rounded-xl mb-2 flex-row items-center justify-between"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-1 mr-3">
                <Text
                  className="font-medium"
                  style={{ color: colors.foreground }}
                  numberOfLines={1}
                >
                  {map.title}
                </Text>
                <Text
                  className="text-xs mt-0.5"
                  style={{ color: colors.mutedForeground }}
                >
                  {new Date(map.updated_at).toLocaleString()} •{" "}
                  {map.is_synced ? "Synced" : "Pending"}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => router.push(`/mindmap/${map.id}`)}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.primary + "20" }}
                >
                  <MaterialIcons
                    name="visibility"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(map.id, map.title)}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.error + "20" }}
                >
                  <MaterialIcons name="delete" size={18} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Logs Section */}
        <Text
          className="text-xs font-semibold uppercase mt-4 mb-2"
          style={{ color: colors.mutedForeground }}
        >
          Activity Log ({logs.length})
        </Text>

        <View
          className="p-3 rounded-xl"
          style={{ backgroundColor: colors.surface }}
        >
          {logs.length === 0 ? (
            <Text
              className="text-xs text-center"
              style={{ color: colors.mutedForeground }}
            >
              No activity yet
            </Text>
          ) : (
            logs.map((log, i) => (
              <Text
                key={i}
                className="text-xs font-mono mb-1"
                style={{ color: colors.foreground }}
              >
                {log}
              </Text>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        className="p-4 border-t"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <Pressable
          onPress={handleCreateTest}
          disabled={isBusy}
          className="py-3 rounded-xl items-center"
          style={{
            backgroundColor: isBusy ? colors.mutedForeground : colors.primary,
          }}
        >
          <Text className="font-semibold" style={{ color: "#fff" }}>
            {create.isPending ? "Creating..." : "Create Test Mindmap"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default StoreManagerScreen;
