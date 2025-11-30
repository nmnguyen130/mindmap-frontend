import { router } from "expo-router";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import Header from "@/components/layout/header";
import FormScreen from "@/components/ui/form-screen";
import SourceDocumentSection from "@/components/mindmap/create/source-document-section";
import { useTheme } from "@/components/providers/theme-provider";
import { useMindMapStore } from "@/features/mindmap/store/mindmap-store";
import { useCreateFromPdf } from "@/features/document/hooks/use-pdf-upload";

interface SelectedFile {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
}

interface MindMapAISourceContext {
  type: "none" | "file" | "url" | "file_and_url";
  file?: SelectedFile;
  url?: string;
}

const CreateMindMapScreen = () => {
  const [title, setTitle] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const { isLoading, createFromPdf: createFromPdfStore, createMap } = useMindMapStore();
  const { colors } = useTheme();
  const createFromPdf = useCreateFromPdf();

  const handleBackPress = () => {
    router.back();
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
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
    }
  };

  const handleCreate = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    try {
      if (selectedFile) {
        // Flow A: With PDF - Upload to backend for AI processing
        const result = await createFromPdf.mutateAsync({
          file: {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType || 'application/pdf',
          },
          title: trimmedTitle,
          generateMindmap: true,
        });

        // Store mindmap from backend response
        if (result.mindmap) {
          // Ensure edges have IDs (backend might not include them)
          const transformedData = {
            ...result.mindmap.mindmap_data,
            edges: result.mindmap.mindmap_data.edges.map((edge: any) => ({
              ...edge,
              id: edge.id || `edge-${Date.now()}-${Math.random()}`,
            })),
          };

          await createFromPdfStore(
            result.mindmap.id,
            result.mindmap.title,
            transformedData
          );
          router.push(`/mindmap/${result.mindmap.id}`);
        } else {
          Alert.alert('Error', 'Backend did not generate a mindmap. Please try again.');
        }
      } else {
        // Flow B: Without PDF - Create blank mindmap locally
        const blankMindmapData = {
          title: trimmedTitle,
          central_topic: trimmedTitle,
          summary: '',
          nodes: [
            {
              id: `node-${Date.now()}`,
              label: trimmedTitle,
              level: 0,
              parent_id: null,
              keywords: [],
              position: { x: 0, y: 0 },
              notes: null,
            }
          ],
          edges: [],
        };

        const createdMap = await createMap(blankMindmapData);
        router.push(`/mindmap/${createdMap.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create mindmap';
      console.error("Mindmap creation failed:", error);
      Alert.alert('Creation Failed', message);
    }
  };

  const canSubmit = title.trim().length > 0 && !isLoading && !createFromPdf.isPending;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Create Mind Map"
        onMenuPress={() => { }}
        showBackButton
        onBackPress={handleBackPress}
      />
      <FormScreen>
        <View className="mb-6">
          <Text
            className="text-xs font-semibold uppercase mb-2"
            style={{ color: colors.mutedForeground }}
          >
            Basic info
          </Text>
          <Text
            className="text-2xl font-bold mb-2"
            style={{ color: colors.foreground }}
          >
            Create a new mind map
          </Text>
          <Text
            className="text-sm"
            style={{ color: colors.mutedForeground }}
          >
            Give your mind map a clear title. Optionally attach a PDF document to generate AI-powered content.
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className="text-sm font-semibold mb-2"
            style={{ color: colors.foreground }}
          >
            Title
          </Text>
          <TextInput
            className="w-full rounded-xl px-4 py-3 border"
            placeholder="Mind map title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            style={{
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.foreground,
            }}
          />
        </View>

        <SourceDocumentSection
          documentUrl={documentUrl}
          selectedFileName={selectedFile ? selectedFile.name : null}
          onChangeUrl={setDocumentUrl}
          onPickFile={() => void handlePickFile()}
        />

        <View className="mt-auto">
          <Pressable
            className="w-full rounded-xl px-4 py-3 items-center justify-center"
            onPress={() => void handleCreate()}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit
                ? colors.primary
                : colors.mutedForeground,
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: colors.primaryForeground }}
            >
              {createFromPdf.isPending ? "Uploading..." : isLoading ? "Creating..." : "Create mind map"}
            </Text>
          </Pressable>
        </View>
      </FormScreen>
    </View>
  );
};

export default CreateMindMapScreen;
