import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { ThemeColors } from "@/components/providers/theme-provider";
import type { MindMapNode } from "@/features/mindmap";

interface NodeFloatBoxProps {
  node: MindMapNode;
  colors: ThemeColors;
  onOpenChat: () => void;
  onClose: () => void;
}

const NodeFloatBox = ({
  node,
  colors,
  onOpenChat,
  onClose,
}: NodeFloatBoxProps) => {
  return (
    <View
      className="absolute bottom-6 left-4 right-4 rounded-2xl p-4 shadow-lg"
      style={{ backgroundColor: colors.surface }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-base font-semibold flex-1 mr-2"
          style={{ color: colors.foreground }}
          numberOfLines={1}
        >
          {node.label}
        </Text>
        <Pressable
          onPress={onClose}
          className="w-7 h-7 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <MaterialIcons
            name="close"
            size={16}
            color={colors.secondaryForeground}
          />
        </Pressable>
      </View>

      {/* Hint */}
      <Text className="text-xs mb-3" style={{ color: colors.mutedForeground }}>
        Drag node to move • Tap button to chat
      </Text>

      {/* Actions */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={onOpenChat}
          className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
          style={{ backgroundColor: colors.primary }}
        >
          <MaterialIcons
            name="chat"
            size={18}
            color={colors.primaryForeground}
          />
          <Text
            className="font-medium"
            style={{ color: colors.primaryForeground }}
          >
            Open Chat
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default NodeFloatBox;
