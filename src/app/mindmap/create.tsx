import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useMindMapStore } from "@/stores/mindmaps";

const CreateMindMapScreen = () => {
  const [title, setTitle] = useState("");
  const { createMap, setCurrentMap, maps } = useMindMapStore();

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      const newMap = await createMap({
        title: title.trim(),
        nodes: [],
      });
      setCurrentMap(newMap);
      router.push(`/mindmap/${newMap.id}`);
    } catch (error) {
      console.error("Create failed:", error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Create New Mind Map
      </Text>

      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="Mind Map Title"
        value={title}
        onChangeText={setTitle}
      />

      <Pressable
        className="w-full p-3 bg-blue-500 rounded-lg"
        onPress={() => void handleCreate()}
        disabled={false}
      >
        <Text className="text-white text-center font-semibold">
          Create Mind Map
        </Text>
      </Pressable>
    </View>
  );
};

export default CreateMindMapScreen;
