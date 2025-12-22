import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { ThemeColors } from "@/components/providers/theme-provider";
import type { MindMapEdge, MindMapNode } from "@/features/mindmap";

interface ConnectionInfo {
  id: string;
  targetNode: MindMapNode;
  direction: "from" | "to";
}

interface NodeFloatBoxProps {
  node: MindMapNode;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  colors: ThemeColors;
  onOpenChat: () => void;
  onDelete: () => void;
  onDeleteConnection: (connectionId: string) => void;
  onClose: () => void;
}

const NodeFloatBox = ({
  node,
  nodes,
  edges,
  colors,
  onOpenChat,
  onDelete,
  onDeleteConnection,
  onClose,
}: NodeFloatBoxProps) => {
  // Find connections for this node
  const connections = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result: ConnectionInfo[] = [];

    edges.forEach((edge) => {
      if (edge.from === node.id) {
        const target = nodeMap.get(edge.to);
        if (target)
          result.push({ id: edge.id, targetNode: target, direction: "to" });
      } else if (edge.to === node.id) {
        const target = nodeMap.get(edge.from);
        if (target)
          result.push({ id: edge.id, targetNode: target, direction: "from" });
      }
    });

    return result;
  }, [node.id, nodes, edges]);

  return (
    <View
      className="absolute bottom-6 left-4 right-4 rounded-2xl p-4 shadow-lg"
      style={{ backgroundColor: colors.surface, maxHeight: 300 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
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

      {/* Connections */}
      {connections.length > 0 && (
        <View className="mb-3">
          <Text
            className="text-xs mb-2"
            style={{ color: colors.mutedForeground }}
          >
            Connections ({connections.length})
          </Text>
          <ScrollView
            style={{ maxHeight: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {connections.map((conn) => (
              <View
                key={conn.id}
                className="flex-row items-center justify-between py-1.5 px-2 mb-1 rounded-lg"
                style={{ backgroundColor: colors.secondary }}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <MaterialIcons
                    name={
                      conn.direction === "to" ? "arrow-forward" : "arrow-back"
                    }
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <Text
                    className="text-sm ml-2 flex-1"
                    style={{ color: colors.foreground }}
                    numberOfLines={1}
                  >
                    {conn.targetNode.label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDeleteConnection(conn.id)}
                  className="p-1"
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="link-off"
                    size={16}
                    color={colors.error}
                  />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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
            Chat
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          className="flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl"
          style={{ backgroundColor: colors.error }}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};

export default NodeFloatBox;
