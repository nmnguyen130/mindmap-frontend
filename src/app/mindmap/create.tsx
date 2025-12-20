import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Header from "@/components/layout/header";
import SourceDocumentSection from "@/components/mindmap/create/source-document-section";
import { useTheme } from "@/components/providers/theme-provider";
import ThemedTextInput from "@/components/ui/text-input";
import { useCreateFromPdf } from "@/features/document/hooks/use-pdf-upload";
import { useMindmaps } from "@/features/mindmap";

interface SelectedFile {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
}

const CreateMindMapScreen = () => {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const { create, isLoading } = useMindmaps();
  const { colors, isDark } = useTheme();
  const createFromPdf = useCreateFromPdf();

  // Gradients
  const heroGradient: [string, string] = isDark
    ? ["#1e3a8a", "#312e81"]
    : ["#3b82f6", "#8b5cf6"];

  const buttonGradient: [string, string] = isDark
    ? ["#059669", "#047857"]
    : ["#10b981", "#059669"];

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setSelectedFile({
        name: asset.name ?? "Untitled document",
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        size: asset.size ?? null,
      });
    } catch (error) {
      console.error("Document pick failed:", error);
      Alert.alert("Error", "Failed to select document.");
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert("Missing Title", "Please enter a title for your mindmap.");
      return;
    }

    try {
      if (selectedFile) {
        // With PDF - AI processing
        const result = await createFromPdf.mutateAsync({
          file: {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType || "application/pdf",
          },
          title: trimmedTitle,
          generateMindmap: true,
        });

        if (result.mindmap) {
          const transformedEdges = result.mindmap.mindmap_data.edges.map(
            (edge) => ({
              id: edge.id,
              from: edge.from,
              to: edge.to,
              relationship: edge.relationship,
            })
          );
          const transformedNodes = result.mindmap.mindmap_data.nodes.map(
            (node) => ({
              id: node.id,
              label: node.label,
              keywords: node.keywords,
              level: node.level,
              parent_id: node.parent_id ?? undefined,
              position: { x: 0, y: 0 },
            })
          );

          await create.mutateAsync({
            id: result.mindmap.id,
            title: result.mindmap.title,
            central_topic: result.mindmap.mindmap_data.central_topic,
            summary: result.mindmap.mindmap_data.summary,
            nodes: transformedNodes,
            edges: transformedEdges,
          });
          router.push(`/mindmap/${result.mindmap.id}`);
        } else {
          Alert.alert("Error", "Failed to generate mindmap. Try again.");
        }
      } else {
        // Blank mindmap - completely empty, no nodes
        const newId = Crypto.randomUUID();

        await create.mutateAsync({
          id: newId,
          title: trimmedTitle,
          central_topic: trimmedTitle,
          summary: "",
          nodes: [],
          edges: [],
        });

        router.push(`/mindmap/${newId}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create mindmap";
      console.error("Mindmap creation failed:", error);
      Alert.alert("Creation Failed", message);
    }
  }, [title, selectedFile, create, createFromPdf]);

  const isProcessing = isLoading || createFromPdf.isPending;
  const canSubmit = title.trim().length > 0 && !isProcessing;

  const getButtonText = () => {
    if (createFromPdf.isPending) return "Processing...";
    if (isLoading) return "Creating...";
    if (selectedFile) return "Create with AI";
    return "Create Mindmap";
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="New Mindmap"
        onMenuPress={() => {}}
        showBackButton
        onBackPress={handleBackPress}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 pt-5 pb-6"
          >
            <View className="flex-row items-center mb-2">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <MaterialIcons name="add-circle" size={22} color="#ffffff" />
              </View>
              <Text className="text-2xl font-bold" style={{ color: "#ffffff" }}>
                Create Mindmap
              </Text>
            </View>
            <Text
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              Start blank or upload a PDF for AI generation
            </Text>
          </LinearGradient>

          {/* Form Content */}
          <View className="px-5 py-5">
            <ThemedTextInput
              label="Title"
              placeholder="Enter mindmap title..."
              value={title}
              onChangeText={setTitle}
              leftIcon="title"
              autoFocus
              returnKeyType="done"
            />

            <SourceDocumentSection
              selectedFileName={selectedFile?.name ?? null}
              onPickFile={handlePickFile}
              onClearFile={handleClearFile}
            />

            {/* Mode Indicator */}
            <View
              className="flex-row items-center p-4 rounded-2xl"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{
                  backgroundColor: selectedFile
                    ? colors.success + "20"
                    : colors.primary + "20",
                }}
              >
                <MaterialIcons
                  name={selectedFile ? "auto-awesome" : "edit"}
                  size={20}
                  color={selectedFile ? colors.success : colors.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.foreground }}
                >
                  {selectedFile ? "AI-Powered" : "Manual Creation"}
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: colors.mutedForeground }}
                >
                  {selectedFile
                    ? "AI will generate nodes from PDF"
                    : "Start with a blank canvas"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Button */}
        <View
          className="px-5 pb-6 pt-4"
          style={{
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            onPress={handleCreate}
            disabled={!canSubmit}
            style={{
              opacity: canSubmit ? 1 : 0.5,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={canSubmit ? buttonGradient : [colors.muted, colors.muted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 16,
              }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialIcons
                  name={selectedFile ? "auto-awesome" : "add"}
                  size={22}
                  color="#ffffff"
                />
              )}
              <Text
                className="text-base font-bold ml-2"
                style={{ color: "#ffffff" }}
              >
                {getButtonText()}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CreateMindMapScreen;
