import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import Canvas from "@/components/mindmap/canvas/canvas";
import { useMindMapStore, MindMapNode } from "@/stores/mindmaps";

export default function MindMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { maps, currentMap, loadMap, isLoading, error } = useMindMapStore();

  useEffect(() => {
    if (id) {
      loadMap(id).catch((err) => {
        console.error("Load map error:", err);
      });
    }
  }, [id, loadMap]);

  const map = currentMap || maps.find((m) => m.id === id);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Loading mind map...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-red-600 dark:text-red-400">
          Error: {error}
        </Text>
      </View>
    );
  }

  if (!map) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Mind map not found
        </Text>
      </View>
    );
  }

  const handleNodeUpdate = (nodeId: string, updates: Partial<MindMapNode>) => {
    // TODO: Implement node update
    console.log("Update node:", nodeId, updates);
  };

  const handleNodeDelete = (nodeId: string) => {
    // TODO: Implement node deletion
    console.log("Delete node:", nodeId);
  };

  const handleConnectionAdd = (from: string, to: string) => {
    // TODO: Implement connection addition
    console.log("Add connection:", from, to);
  };

  const handleConnectionDelete = (connectionId: string) => {
    // TODO: Implement connection deletion
    console.log("Delete connection:", connectionId);
  };

  return (
    <View className="flex-1">
      <View className="p-4 bg-gray-100 dark:bg-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {map.title}
        </Text>
      </View>
      <Canvas
        mindMapId={map.id}
        nodes={map.nodes}
        onNodeUpdate={handleNodeUpdate}
        onNodeDelete={handleNodeDelete}
        onConnectionAdd={handleConnectionAdd}
        onConnectionDelete={handleConnectionDelete}
      />
    </View>
  );
}
