import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { ThemeColors } from "@/components/providers/theme-provider";
import { MindMapNode, useMindMapStore } from "@/stores/mindmaps";

interface NodeSelectionPanelProps {
  selectedNode: MindMapNode | null;
  colors: ThemeColors;
  relatedNodes?: MindMapNode[];
}

const NodeSelectionPanel = ({
  selectedNode,
  colors,
  relatedNodes = [],
}: NodeSelectionPanelProps) => {
  const { currentMap, updateNodeNotes } = useMindMapStore();
  const [draftNotes, setDraftNotes] = useState<string>("");

  useEffect(() => {
    if (selectedNode?.notes) {
      setDraftNotes(selectedNode.notes);
    } else {
      setDraftNotes("");
    }
  }, [selectedNode?.id, selectedNode?.notes]);

  const isEditable = !!currentMap;

  if (!selectedNode) return null;

  const hasRelated = relatedNodes.length > 0;
  const connectionSummary = hasRelated
    ? `Connected to ${relatedNodes.length} other topic${
        relatedNodes.length === 1 ? "" : "s"
      }.`
    : "This topic has no direct connections yet.";
  const aiHint = hasRelated
    ? " AI-powered insights for this area will appear here later."
    : " In a future version, AI will help you expand it with related ideas.";

  return (
    <View className="absolute left-0 right-0 bottom-0 px-4 pb-6">
      <View
        className="rounded-2xl p-4 shadow-lg"
        style={{ backgroundColor: colors.surface }}
      >
        <Text
          className="text-xs font-semibold uppercase mb-2"
          style={{ color: colors.mutedForeground }}
        >
          Selected topic
        </Text>

        <Text
          className="text-sm font-semibold mb-2"
          style={{ color: colors.foreground }}
          numberOfLines={3}
        >
          {selectedNode.text}
        </Text>

        <Text
          className="text-[11px] mb-2"
          style={{ color: colors.mutedForeground }}
        >
          {connectionSummary + aiHint}
        </Text>

        <View className="mt-1">
          <Text
            className="text-[11px] font-semibold mb-1"
            style={{ color: colors.mutedForeground }}
          >
            Node notes
          </Text>
          {isEditable ? (
            <TextInput
              className="rounded-xl px-3 py-2 text-xs border"
              multiline
              value={draftNotes}
              onChangeText={setDraftNotes}
              onBlur={() => {
                const trimmed = draftNotes.trim();
                void updateNodeNotes(
                  selectedNode.id,
                  trimmed.length > 0 ? trimmed : null,
                );
              }}
              placeholder="Tóm tắt nhanh nội dung chính của mục này..."
              placeholderTextColor={colors.mutedForeground}
              style={{
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                textAlignVertical: "top",
                minHeight: 64,
              }}
            />
          ) : selectedNode.notes ? (
            <Text
              className="text-[11px] leading-relaxed"
              style={{ color: colors.mutedForeground }}
            >
              {selectedNode.notes}
            </Text>
          ) : (
            <Text
              className="text-[11px] leading-relaxed"
              style={{ color: colors.mutedForeground }}
            >
              Use this area to summarize the key points for this topic.
            </Text>
          )}
        </View>

        {hasRelated && (
          <View className="mt-1">
            <Text
              className="text-[11px] font-semibold mb-1"
              style={{ color: colors.mutedForeground }}
            >
              Related topics
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {relatedNodes.slice(0, 4).map((node) => (
                <View
                  key={node.id}
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: colors.secondaryForeground }}
                    numberOfLines={1}
                  >
                    {node.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default NodeSelectionPanel;
