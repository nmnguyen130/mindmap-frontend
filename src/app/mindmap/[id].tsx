import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

import Canvas from "@/components/mindmap/canvas/canvas";
import { defaultMindMap } from "@/data/default-mindmap";
import { MindMapNode, useMindMapStore } from "@/stores/mindmaps";

export default function MindMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { maps, currentMap, loadMap, isLoading, error } = useMindMapStore();

  useEffect(() => {
    if (id && id !== "default") {
      loadMap(id).catch((err) => {
        console.error("Load map error:", err);
      });
    }
  }, [id, loadMap]);

  const map = useMemo(() => {
    // If ID is 'default', return the default mind map
    if (id === "default") {
      return defaultMindMap;
    }

    // Otherwise try to find the map from store
    return currentMap || maps.find((m) => m.id === id);
  }, [id, currentMap, maps]);

  if (isLoading && id !== "default") {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Loading mind map...
        </Text>
      </View>
    );
  }

  if (error && id !== "default") {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-red-600 dark:text-red-400">
          Error: {error}
        </Text>
      </View>
    );
  }

  if (!map && id !== "default") {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Mind map not found
        </Text>
      </View>
    );
  }

  const handleNodeUpdate = (nodeId: string, updates: Partial<MindMapNode>) => {
    // For default demo map, don't allow updates
    if (id === "default") {
      console.log("Demo mode - updates disabled");
      return;
    }
    // TODO: Implement node update for user maps
    console.log("Update node:", nodeId, updates);
  };

  const handleNodeDelete = (nodeId: string) => {
    // For default demo map, don't allow deletions
    if (id === "default") {
      console.log("Demo mode - deletions disabled");
      return;
    }
    // TODO: Implement node deletion for user maps
    console.log("Delete node:", nodeId);
  };

  const handleConnectionAdd = (from: string, to: string) => {
    // For default demo map, don't allow additions
    if (id === "default") {
      console.log("Demo mode - additions disabled");
      return;
    }
    // TODO: Implement connection addition for user maps
    console.log("Add connection:", from, to);
  };

  const handleConnectionDelete = (connectionId: string) => {
    // For default demo map, don't allow deletions
    if (id === "default") {
      console.log("Demo mode - deletions disabled");
      return;
    }
    // TODO: Implement connection deletion for user maps
    console.log("Delete connection:", connectionId);
  };

  return (
    <View className="flex-1">
      <View className="p-4 bg-gray-100 dark:bg-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {map.title}
        </Text>
        {id === "default" && (
          <Text className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Demo Mode - View Only
          </Text>
        )}
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
