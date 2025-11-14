import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export interface MindMapListItemProps {
  title: string;
  nodeCount: number;
  updatedAtLabel: string;
  surfaceColor: string;
  borderColor: string;
  foregroundColor: string;
  mutedColor: string;
  onPress: () => void;
}

const MindMapListItem = ({
  title,
  nodeCount,
  updatedAtLabel,
  surfaceColor,
  borderColor,
  foregroundColor,
  mutedColor,
  onPress,
}: MindMapListItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-4 rounded-xl mb-3 border"
      style={{
        backgroundColor: surfaceColor,
        borderColor,
      }}
    >
      <View className="flex-1 mr-3">
        <Text
          className="text-base font-semibold mb-1"
          style={{ color: foregroundColor }}
        >
          {title}
        </Text>
        <Text className="text-xs" style={{ color: mutedColor }}>
          {nodeCount} nodes • Updated: {updatedAtLabel}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
    </Pressable>
  );
}

export default MindMapListItem;
