import { MaterialIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import Header from "@/components/layout/header";
import Canvas from "@/components/mindmap/canvas/canvas";
import { useTheme } from "@/components/providers/theme-provider";
import {
  calculateWeightedRadialLayout,
  fullMindmapToUI,
  useMindmap,
  useMindmapUI,
} from "@/features/mindmap";

const MindMapScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [isLayouting, setIsLayouting] = useState(false);

  // UI Store - sync current map on mount/unmount
  const { setCurrentMap, reset: resetUI } = useMindmapUI();

  useEffect(() => {
    if (id) setCurrentMap(id);
    return () => resetUI();
  }, [id, setCurrentMap, resetUI]);

  // Fetch mindmap data
  const {
    data,
    isLoading,
    error,
    updateNodePositions,
    addNode,
    addConnection,
    deleteNode,
    deleteConnection,
  } = useMindmap(id ?? null);

  // Transform DB data to UI format
  const map = useMemo(() => {
    if (!data) return null;
    return fullMindmapToUI(data);
  }, [data]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  // Auto-layout handler
  const handleAutoLayout = useCallback(async () => {
    if (!map || map.nodes.length === 0) return;

    setIsLayouting(true);
    try {
      const layoutedNodes = calculateWeightedRadialLayout(map.nodes, map.edges);
      const updates = layoutedNodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));
      await updateNodePositions.mutateAsync(updates);
    } catch (err) {
      console.error("Auto-layout failed:", err);
    } finally {
      setIsLayouting(false);
    }
  }, [map, updateNodePositions]);

  // Single node move handler - persist to database
  const handleNodeMove = useCallback(
    (nodeId: string, x: number, y: number) => {
      updateNodePositions.mutate([{ id: nodeId, x, y }]);
    },
    [updateNodePositions]
  );

  // Add new node handler
  const handleAddNode = useCallback(() => {
    if (!id) return;
    addNode.mutate({
      id: Crypto.randomUUID(),
      mindmap_id: id,
      label: "New Node",
      level: 1,
      position_x: 0,
      position_y: 0,
    });
  }, [id, addNode]);

  // Add connection handler
  const handleAddConnection = useCallback(
    (fromId: string, toId: string) => {
      addConnection.mutate({
        id: Crypto.randomUUID(),
        from_node_id: fromId,
        to_node_id: toId,
      });
    },
    [addConnection]
  );

  // Delete node handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNode.mutate(nodeId);
    },
    [deleteNode]
  );

  // Delete connection handler
  const handleDeleteConnection = useCallback(
    (connectionId: string) => {
      deleteConnection.mutate(connectionId);
    },
    [deleteConnection]
  );

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title="Loading"
          onMenuPress={() => {}}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            className="text-base mt-4"
            style={{ color: colors.mutedForeground }}
          >
            Loading mind map...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title="Error"
          onMenuPress={() => {}}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={56} color={colors.error} />
          <Text
            className="text-lg font-semibold mt-4"
            style={{ color: colors.foreground }}
          >
            Failed to load
          </Text>
          <Text
            className="text-sm text-center mt-2"
            style={{ color: colors.mutedForeground }}
          >
            {error.message}
          </Text>
        </View>
      </View>
    );
  }

  // Not found state
  if (!map) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title="Not Found"
          onMenuPress={() => {}}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons
            name="search-off"
            size={56}
            color={colors.mutedForeground}
          />
          <Text
            className="text-lg font-semibold mt-4"
            style={{ color: colors.foreground }}
          >
            Mind map not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={map.title}
        onMenuPress={() => {}}
        showBackButton
        onBackPress={handleBackPress}
      />

      {/* Floating Toolbar */}
      <View
        className="absolute top-24 left-4 z-10 flex-row items-center gap-3 rounded-full px-3 py-2"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Stats */}
        <Text className="text-xs" style={{ color: colors.foreground }}>
          {map.nodes.length} nodes · {map.edges.length} links
        </Text>

        {/* Auto Layout Button */}
        <Pressable
          onPress={handleAutoLayout}
          disabled={isLayouting || map.nodes.length === 0}
          className="flex-row items-center justify-center gap-1 rounded-full px-3 py-1.5"
          style={{
            backgroundColor: colors.primary,
            minWidth: 80,
            opacity: isLayouting || map.nodes.length === 0 ? 0.6 : 1,
          }}
        >
          {isLayouting ? (
            <ActivityIndicator size={12} color={colors.primaryForeground} />
          ) : (
            <MaterialIcons
              name="auto-fix-high"
              size={14}
              color={colors.primaryForeground}
            />
          )}
          <Text
            className="text-xs font-medium"
            style={{ color: colors.primaryForeground }}
          >
            Layout
          </Text>
        </Pressable>
      </View>

      {/* Canvas */}
      <View className="flex-1">
        {map.nodes.length > 0 ? (
          <Canvas
            nodes={map.nodes}
            edges={map.edges}
            mindmapId={id}
            documentId={map.document_id}
            onNodeMove={handleNodeMove}
            onAddNode={handleAddNode}
            onAddConnection={handleAddConnection}
            onDeleteNode={handleDeleteNode}
            onDeleteConnection={handleDeleteConnection}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons
              name="bubble-chart"
              size={56}
              color={colors.mutedForeground}
            />
            <Text
              className="text-base font-semibold mt-4"
              style={{ color: colors.foreground }}
            >
              Empty mind map
            </Text>
            <Text
              className="text-sm text-center mt-1"
              style={{ color: colors.mutedForeground }}
            >
              No nodes yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default MindMapScreen;
