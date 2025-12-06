import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useMindmaps, useCreateMindmap, useDeleteMindmap, mindmapKeys } from "@/features/mindmap/hooks";
import { useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Store Manager Screen - Test TanStack Query hooks with SQLite
// ============================================================================

const StoreManagerScreen = () => {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<string[]>([]);

  // TanStack Query hooks
  const { data: mindmaps = [], isLoading, error, refetch } = useMindmaps();
  const createMutation = useCreateMindmap();
  const deleteMutation = useDeleteMindmap();

  const addLog = (message: string) => {
    console.log("[Manager]", message);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // ========================================================================
  // Test Actions
  // ========================================================================

  const handleCreate = async () => {
    addLog("Creating test mindmap...");
    const timestamp = Date.now();
    const id = `test-${timestamp}`;

    try {
      await createMutation.mutateAsync({
        id,
        title: `Test Mindmap ${new Date().toLocaleTimeString()}`,
        central_topic: "Main Topic",
        summary: "Created from Store Manager",
        nodes: [
          {
            id: `node1-${timestamp}`,
            label: "Central Node",
            keywords: ["main", "center"],
            level: 0,
            position: { x: 0, y: 0 },
          },
          {
            id: `node2-${timestamp}`,
            label: "Child Node 1",
            keywords: ["child"],
            level: 1,
            parent_id: `node1-${timestamp}`,
            position: { x: 200, y: -100 },
          },
          {
            id: `node3-${timestamp}`,
            label: "Child Node 2",
            keywords: ["child"],
            level: 1,
            parent_id: `node1-${timestamp}`,
            position: { x: 200, y: 100 },
          },
        ],
        edges: [
          { id: `edge1-${timestamp}`, from: `node1-${timestamp}`, to: `node2-${timestamp}` },
          { id: `edge2-${timestamp}`, from: `node1-${timestamp}`, to: `node3-${timestamp}` },
        ],
      });

      addLog(`✅ Created mindmap: ${id}`);
      addLog(`   3 nodes, 2 edges`);
    } catch (err) {
      addLog(`❌ Create failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRefresh = async () => {
    addLog("Refreshing from SQLite...");
    try {
      await refetch();
      addLog(`✅ Loaded ${mindmaps.length} mindmaps`);
    } catch (err) {
      addLog(`❌ Refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleViewData = () => {
    addLog(`=== Database Contents (${mindmaps.length} mindmaps) ===`);

    if (mindmaps.length === 0) {
      addLog("   (empty)");
      return;
    }

    mindmaps.forEach((map, i) => {
      addLog(`${i + 1}. "${map.title}"`);
      addLog(`   ID: ${map.id}`);
      addLog(`   Updated: ${new Date(map.updated_at).toLocaleString()}`);
      addLog(`   Synced: ${map.is_synced ? "Yes" : "No"}`);
    });
  };

  const handleDelete = () => {
    if (mindmaps.length === 0) {
      addLog("No mindmaps to delete");
      return;
    }

    const options = mindmaps.map((m) => ({ text: m.title, id: m.id }));

    Alert.alert("Delete Mindmap", "Select mindmap to delete:", [
      ...options.map((opt) => ({
        text: opt.text,
        style: "destructive" as const,
        onPress: async () => {
          addLog(`Deleting: ${opt.text}...`);
          try {
            await deleteMutation.mutateAsync(opt.id);
            addLog(`✅ Deleted: ${opt.id}`);
          } catch (err) {
            addLog(`❌ Delete failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleClearCache = () => {
    queryClient.clear();
    addLog("✅ TanStack Query cache cleared");
  };

  const clearLogs = () => setLogs([]);

  // ========================================================================
  // Render
  // ========================================================================

  const isBusy = isLoading || createMutation.isPending || deleteMutation.isPending;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Store Manager (TanStack Query)
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Test SQLite + TanStack Query hooks
        </Text>
      </View>

      {/* Status Bar */}
      <View className="px-4 py-2 bg-blue-50 dark:bg-blue-900 flex-row items-center">
        {isBusy && <ActivityIndicator size="small" className="mr-2" />}
        <Text className="text-blue-800 dark:text-blue-200 text-sm">
          {mindmaps.length} mindmaps | {isBusy ? "Working..." : "Ready"}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="p-4">
        <View className="flex-row mb-3">
          <TouchableOpacity
            className="bg-blue-600 p-3 rounded-lg flex-1 mr-2"
            onPress={() => void handleCreate()}
            disabled={isBusy}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Create Test
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 p-3 rounded-lg flex-1 mr-2"
            onPress={() => void handleRefresh()}
            disabled={isBusy}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Refresh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-indigo-600 p-3 rounded-lg flex-1"
            onPress={handleViewData}
            disabled={isBusy}
          >
            <Text className="text-white text-center font-semibold text-sm">
              View Data
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row">
          <TouchableOpacity
            className="bg-red-600 p-3 rounded-lg flex-1 mr-2"
            onPress={handleDelete}
            disabled={isBusy || mindmaps.length === 0}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Delete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-orange-600 p-3 rounded-lg flex-1 mr-2"
            onPress={handleClearCache}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Clear Cache
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-600 p-3 rounded-lg flex-1"
            onPress={clearLogs}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Clear Logs
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View className="bg-red-100 dark:bg-red-900 p-3 rounded-lg mt-3">
            <Text className="text-red-800 dark:text-red-200">
              Error: {error instanceof Error ? error.message : String(error)}
            </Text>
          </View>
        )}
      </View>

      {/* Logs */}
      <ScrollView className="flex-1 px-4 pb-4">
        <Text className="text-base font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Logs ({logs.length})
        </Text>
        {logs.map((log, i) => (
          <Text
            key={i}
            className="text-xs font-mono mb-1 text-gray-700 dark:text-gray-300 leading-tight"
          >
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default StoreManagerScreen;
