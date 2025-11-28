import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MindMapNode, useMindMapStore } from "@/stores/mindmap";

interface NodeSelectionPanelProps {
  selectedNode: MindMapNode | null;
  colors: ThemeColors;
  relatedNodes?: MindMapNode[];
  onClose?: () => void;
}

const NodeSelectionPanel = ({
  selectedNode,
  colors,
  relatedNodes = [],
  onClose,
}: NodeSelectionPanelProps) => {
  const { currentMap, updateNodeNotes } = useMindMapStore();
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [aiQuery, setAiQuery] = useState<string>("");
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const notesInputRef = useRef<TextInput>(null);
  const aiInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animate panel in/out with better timing
  useEffect(() => {
    if (selectedNode) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(fadeAnim, {
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
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedNode, slideAnim, fadeAnim]);

  // Sync draft notes with selected node
  useEffect(() => {
    if (selectedNode?.notes) {
      setDraftNotes(selectedNode.notes);
    } else {
      setDraftNotes("");
    }
    setAiQuery("");
  }, [selectedNode?.id, selectedNode?.notes]);

  // Handle saving notes with optimistic update
  const handleSaveNotes = useCallback(async () => {
    if (!selectedNode || !currentMap) return;

    const trimmed = draftNotes.trim();
    const newNotes = trimmed.length > 0 ? trimmed : null;

    // Skip if unchanged
    if (newNotes === selectedNode.notes) return;

    setIsSaving(true);
    try {
      await updateNodeNotes(selectedNode.id, newNotes);
    } catch (error) {
      console.error("Failed to save notes:", error);
      // Revert on error
      setDraftNotes(selectedNode.notes || "");
    } finally {
      setIsSaving(false);
    }
  }, [selectedNode, currentMap, draftNotes, updateNodeNotes]);

  // Handle AI query submission
  // TODO: Implement AI API integration for deep understanding
  // TODO: Add conversation history for context
  // TODO: Support follow-up questions
  // TODO: Generate mind map expansions from AI responses
  const handleAiQuery = useCallback(async () => {
    if (!aiQuery.trim() || !selectedNode) return;

    // TODO: Send query to AI service
    // TODO: Display AI response in chat-like interface
    // TODO: Offer options to add AI insights to notes or create new nodes

    console.log("AI Query:", aiQuery, "for node:", selectedNode.label);
    setAiQuery("");
    Keyboard.dismiss();
  }, [aiQuery, selectedNode]);

  // Compute related topics summary
  const relatedSummary = useMemo(() => {
    if (relatedNodes.length === 0) return null;
    if (relatedNodes.length <= 3) {
      return relatedNodes.map((n) => n.label).join(", ");
    }
    return `${relatedNodes.slice(0, 2).map((n) => n.label).join(", ")} and ${relatedNodes.length - 2} more`;
  }, [relatedNodes]);

  if (!selectedNode) return null;

  const isEditable = !!currentMap;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="absolute left-0 right-0 bottom-0"
      keyboardVerticalOffset={0}
    >
      <Animated.View
        className="flex-1"
        style={{
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }}
      >
        <View className="px-4 pb-6 flex-1">
          <View
            className="rounded-3xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: colors.surface,
              maxHeight: "75%",
              minHeight: 420,
            }}
          >
            {/* Compact Header */}
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
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Notes Section */}
              <View className="px-4 py-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className="text-xs font-bold uppercase"
                    style={{ color: colors.mutedForeground }}
                  >
                    Quick Notes
                  </Text>
                  {isSaving && (
                    <View className="flex-row items-center gap-1">
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text className="text-xs" style={{ color: colors.primary }}>
                        Saving...
                      </Text>
                    </View>
                  )}
                </View>

                {isEditable ? (
                  <TextInput
                    ref={notesInputRef}
                    className="rounded-xl px-3 py-3 text-sm border"
                    multiline
                    value={draftNotes}
                    onChangeText={setDraftNotes}
                    onBlur={handleSaveNotes}
                    placeholder="Add your notes and insights here..."
                    placeholderTextColor={colors.mutedForeground}
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      textAlignVertical: "top",
                      minHeight: 100,
                      maxHeight: 200,
                    }}
                    editable={!isSaving}
                  />
                ) : draftNotes ? (
                  <View
                    className="rounded-xl px-3 py-3 border"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Text className="text-sm leading-relaxed" style={{ color: colors.foreground }}>
                      {draftNotes}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm" style={{ color: colors.mutedForeground }}>
                    No notes yet.
                  </Text>
                )}
              </View>

              {/* AI Chat Section - More Space */}
              <View className="px-4 pb-4 flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <MaterialIcons name="psychology" size={18} color={colors.primary} />
                  <Text
                    className="text-xs font-bold uppercase"
                    style={{ color: colors.mutedForeground }}
                  >
                    Ask AI Assistant
                  </Text>
                </View>

                {/* AI Chat Interface */}
                <View
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    minHeight: 160,
                  }}
                >
                  {/* Chat Messages Area - TODO: Add message history */}
                  <ScrollView
                    className="flex-1 px-3 py-3"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text className="text-xs leading-relaxed" style={{ color: colors.mutedForeground }}>
                      Coming Soon: Ask questions about this topic and get AI-powered insights
                    </Text>
                    <View className="mt-2 gap-1">
                      <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                        "Explain this concept in simple terms"
                      </Text>
                      <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                        "What are related topics I should explore?"
                      </Text>
                      <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                        "Generate a summary of key points"
                      </Text>
                    </View>
                    {/* TODO: Render AI conversation history here */}
                  </ScrollView>

                  {/* AI Input Bar */}
                  <View
                    className="border-t px-3 py-2"
                    style={{ borderTopColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-2">
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
                        editable={false} // TODO: Enable when AI is implemented
                      />
                      <Pressable
                        onPress={handleAiQuery}
                        disabled={!aiQuery.trim()} // TODO: Remove disabled when AI is ready
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: aiQuery.trim()
                            ? colors.primary
                            : colors.secondary,
                        }}
                      >
                        <MaterialIcons
                          name="send"
                          size={16}
                          color={
                            aiQuery.trim()
                              ? colors.primaryForeground
                              : colors.mutedForeground
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Quick Action Hints */}
                <View className="mt-2 px-2">
                  <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                    Tip: AI will help you understand complex topics and discover connections
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default NodeSelectionPanel;
