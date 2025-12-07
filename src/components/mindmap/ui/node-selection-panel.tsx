import { MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ThemeColors } from "@/components/providers/theme-provider";
import { useRagChat } from "@/features/document/hooks/use-rag-chat";
import type { MindMapNode } from "@/features/mindmap";

interface NodeSelectionPanelProps {
  selectedNode: MindMapNode | null;
  colors: ThemeColors;
  relatedNodes?: MindMapNode[];
  mindmapId: string | null;
  onClose?: () => void;
}

const NodeSelectionPanel = ({
  selectedNode,
  colors,
  relatedNodes = [],
  mindmapId,
  onClose,
}: NodeSelectionPanelProps) => {
  const [aiQuery, setAiQuery] = useState<string>("");
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const aiInputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  // RAG Chat hook
  const { messages, isStreaming, sendMessage, generateSummary, clear } =
    useRagChat({
      documentId: mindmapId || "",
      onError: (error) => {
        console.error("RAG Chat error:", error);
      },
    });

  // Animate panel in/out
  useEffect(() => {
    if (selectedNode) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedNode, slideAnim, backdropAnim]);

  // Sync AI query state
  useEffect(() => {
    setAiQuery("");
  }, [selectedNode?.id]);

  // Auto-generate summary when node is selected
  useEffect(() => {
    if (selectedNode && mindmapId && messages.length === 0) {
      // Generate summary as first message
      generateSummary(selectedNode.label, selectedNode.keywords || []);
    }
  }, [selectedNode?.id, mindmapId]);

  // Clear messages when node changes
  useEffect(() => {
    if (!selectedNode) {
      clear();
    }
  }, [selectedNode, clear]);

  // Auto-scroll to bottom when new message appears
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle AI query submission
  const handleAiQuery = useCallback(async () => {
    if (!aiQuery.trim() || isStreaming) return;

    await sendMessage(aiQuery);
    setAiQuery("");
    Keyboard.dismiss();
  }, [aiQuery, isStreaming, sendMessage]);

  // Compute related topics summary
  const relatedSummary = useMemo(() => {
    if (relatedNodes.length === 0) return null;
    if (relatedNodes.length <= 3) {
      return relatedNodes.map((n) => n.label).join(", ");
    }
    return `${relatedNodes
      .slice(0, 2)
      .map((n) => n.label)
      .join(", ")} and ${relatedNodes.length - 2} more`;
  }, [relatedNodes]);

  if (!selectedNode) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          opacity: backdropAnim,
        }}
        pointerEvents={selectedNode ? "auto" : "none"}
      >
        <Pressable style={{ flex: 1 }} onPress={() => onClose?.()} />
      </Animated.View>

      {/* Panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="absolute left-0 right-0 bottom-0"
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
      >
        <Animated.View
          className="flex-1"
          style={{
            transform: [{ translateY: slideAnim }],
          }}
          pointerEvents="box-none"
        >
          <View className="px-4 pb-6 flex-1" pointerEvents="box-none">
            <View
              className="rounded-3xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: colors.surface,
                maxHeight: "100%",
                minHeight: "80%",
              }}
            >
              {/* Header */}
              <View
                className="px-4 pt-3 pb-2 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-2">
                    <Text
                      className="text-base font-bold leading-tight"
                      style={{ color: colors.foreground }}
                      numberOfLines={2}
                    >
                      {selectedNode.label}
                    </Text>
                    {relatedSummary && (
                      <Text
                        className="text-xs mt-1"
                        style={{ color: colors.mutedForeground }}
                        numberOfLines={1}
                      >
                        Connected: {relatedSummary}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => onClose?.()}
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.secondary }}
                  >
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={colors.secondaryForeground}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* General Info Section */}
                <View
                  className="px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text
                    className="text-xs font-bold uppercase mb-2"
                    style={{ color: colors.mutedForeground }}
                  >
                    General Information
                  </Text>

                  {/* Keywords */}
                  {selectedNode.keywords &&
                    selectedNode.keywords.length > 0 && (
                      <View className="mb-2">
                        <Text
                          className="text-xs mb-1"
                          style={{ color: colors.mutedForeground }}
                        >
                          Keywords:
                        </Text>
                        <View className="flex-row flex-wrap gap-1.5">
                          {selectedNode.keywords.map((keyword, idx) => (
                            <View
                              key={idx}
                              className="px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: colors.primary + "20" }}
                            >
                              <Text
                                className="text-xs font-medium"
                                style={{ color: colors.primary }}
                              >
                                {keyword}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                  {/* Level */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground }}
                    >
                      Level:
                    </Text>
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: colors.foreground }}
                    >
                      {selectedNode.level}
                    </Text>
                  </View>
                </View>

                {/* AI Chat Section */}
                <View className="px-4 py-3 flex-1">
                  <View className="flex-row items-center gap-2 mb-2">
                    <MaterialIcons
                      name="psychology"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      className="text-xs font-bold uppercase"
                      style={{ color: colors.mutedForeground }}
                    >
                      AI Assistant
                    </Text>
                  </View>

                  {/* Chat Messages */}
                  <ScrollView
                    ref={chatScrollRef}
                    className="rounded-xl border mb-3"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      minHeight: 200,
                      maxHeight: 300,
                    }}
                    showsVerticalScrollIndicator={false}
                  >
                    <View className="p-3 gap-3">
                      {messages.length === 0 && !isStreaming ? (
                        <Text
                          className="text-xs text-center"
                          style={{ color: colors.mutedForeground }}
                        >
                          Ask questions about this topic...
                        </Text>
                      ) : (
                        messages.map((msg, idx) => (
                          <View
                            key={idx}
                            className={`rounded-xl px-3 py-2 ${
                              msg.role === "user" ? "self-end" : "self-start"
                            }`}
                            style={{
                              backgroundColor:
                                msg.role === "user"
                                  ? colors.primary
                                  : colors.secondary,
                              maxWidth: "85%",
                            }}
                          >
                            <Text
                              className="text-sm leading-relaxed"
                              style={{
                                color:
                                  msg.role === "user"
                                    ? colors.primaryForeground
                                    : colors.secondaryForeground,
                              }}
                            >
                              {msg.content}
                            </Text>
                          </View>
                        ))
                      )}
                      {isStreaming && (
                        <View className="flex-row items-center gap-2">
                          <ActivityIndicator
                            size="small"
                            color={colors.primary}
                          />
                          <Text
                            className="text-xs"
                            style={{ color: colors.mutedForeground }}
                          >
                            AI is thinking...
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>

                  {/* AI Input Bar */}
                  <View
                    className="rounded-xl border overflow-hidden"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    }}
                  >
                    <View className="flex-row items-center gap-2 px-3 py-2">
                      <TextInput
                        ref={aiInputRef}
                        className="flex-1 text-sm"
                        value={aiQuery}
                        onChangeText={setAiQuery}
                        placeholder="Ask anything about this topic..."
                        placeholderTextColor={colors.mutedForeground}
                        style={{ color: colors.foreground }}
                        onSubmitEditing={handleAiQuery}
                        returnKeyType="send"
                        editable={!isStreaming && !!mindmapId}
                      />
                      <Pressable
                        onPress={handleAiQuery}
                        disabled={!aiQuery.trim() || isStreaming}
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{
                          backgroundColor:
                            aiQuery.trim() && !isStreaming
                              ? colors.primary
                              : colors.secondary,
                        }}
                      >
                        <MaterialIcons
                          name="send"
                          size={16}
                          color={
                            aiQuery.trim() && !isStreaming
                              ? colors.primaryForeground
                              : colors.mutedForeground
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
};

export default NodeSelectionPanel;
