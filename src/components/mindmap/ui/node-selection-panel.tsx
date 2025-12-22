import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextStyle,
  View,
} from "react-native";

import { ThemeColors } from "@/components/providers/theme-provider";
import { useRagChat } from "@/features/document/hooks/use-rag-chat";
import type { MindMapNode } from "@/features/mindmap";
import { renderMarkdown } from "@/lib/render-markdown";

interface Props {
  selectedNode: MindMapNode | null;
  colors: ThemeColors;
  documentId?: string;
  onClose?: () => void;
}

const SNAP_POINTS = ["80%"];

/**
 * Bottom sheet panel for AI chat about selected node.
 */
const NodeSelectionPanel = ({
  selectedNode,
  colors,
  documentId,
  onClose,
}: Props) => {
  const [query, setQuery] = useState("");
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollRef = useRef<any>(null);

  const { messages, isStreaming, sendMessage, generateSummary, clear } =
    useRagChat({
      documentId,
      onError: console.error,
    });

  // Sheet control
  useEffect(() => {
    selectedNode
      ? bottomSheetRef.current?.expand()
      : bottomSheetRef.current?.close();
  }, [selectedNode]);

  // Auto-generate summary
  useEffect(() => {
    if (selectedNode && messages.length === 0) {
      generateSummary(selectedNode.label);
    }
  }, [selectedNode?.id]);

  // Clear on node change
  useEffect(() => {
    if (!selectedNode) clear();
    setQuery("");
  }, [selectedNode?.id]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!query.trim() || isStreaming) return;
    await sendMessage(query);
    setQuery("");
    Keyboard.dismiss();
  }, [query, isStreaming, sendMessage]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  const handleChange = useCallback(
    (index: number) => index === -1 && onClose?.(),
    [onClose]
  );

  if (!selectedNode) return null;

  const canSend = query.trim() && !isStreaming;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      onChange={handleChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 36 }}
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "600",
            color: colors.foreground,
          }}
          numberOfLines={1}
        >
          {selectedNode.label}
        </Text>
        <Pressable
          onPress={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons
            name="close"
            size={16}
            color={colors.secondaryForeground}
          />
        </Pressable>
      </View>

      {/* Messages */}
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isStreaming ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.5,
            }}
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={32}
              color={colors.mutedForeground}
            />
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              Ask anything...
            </Text>
          </View>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const textColor = isUser
                ? colors.primaryForeground
                : colors.foreground;
              const baseStyle: TextStyle = {
                fontSize: 13,
                lineHeight: 18,
                color: textColor,
              };

              return (
                <View
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor: isUser ? colors.primary : colors.secondary,
                  }}
                >
                  <Text style={baseStyle}>
                    {isUser
                      ? msg.content
                      : renderMarkdown(msg.content, baseStyle, colors)}
                  </Text>
                </View>
              );
            })}
            {isStreaming && (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                Thinking...
              </Text>
            )}
          </>
        )}
      </BottomSheetScrollView>

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          padding: 10,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.background,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
          }}
        >
          <BottomSheetTextInput
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.foreground,
              paddingVertical: 10,
            }}
            value={query}
            onChangeText={setQuery}
            placeholder="Ask a question..."
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isStreaming}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canSend ? colors.primary : colors.secondary,
          }}
        >
          <MaterialIcons
            name="arrow-upward"
            size={18}
            color={canSend ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </BottomSheet>
  );
};

export default NodeSelectionPanel;
