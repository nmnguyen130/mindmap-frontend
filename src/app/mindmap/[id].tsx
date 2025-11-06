import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

import Canvas from "@/components/mindmap/canvas/canvas";
import { defaultMindMap } from "@/data/default-mindmap";
import { useMindMapStore } from "@/stores/mindmaps";

const MindMapScreen = () => {
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

  if (!map) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Mind map not found
        </Text>
      </View>
    );
  }

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
      <Canvas nodes={map.nodes} />
    </View>
  );
};

export default MindMapScreen;
