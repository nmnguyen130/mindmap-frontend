import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";

interface SourceDocumentSectionProps {
  documentUrl: string;
  selectedFileName: string | null;
  onChangeUrl: (value: string) => void;
  onPickFile: () => void;
}

const SourceDocumentSection = ({
  documentUrl,
  selectedFileName,
  onChangeUrl,
  onPickFile,
}: SourceDocumentSectionProps) => {
  const { colors } = useTheme();

  return (
    <View className="mb-8">
      <Text
        className="text-sm font-semibold mb-2"
        style={{ color: colors.foreground }}
      >
        Source document (optional)
      </Text>
      <Text
        className="text-xs mb-3"
        style={{ color: colors.mutedForeground }}
      >
        Attach a file or paste a link to the document you want to base this mind
        map on.
      </Text>

      <Pressable
        className="flex-row items-center rounded-xl px-4 py-3 mb-4 border"
        onPress={onPickFile}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: colors.secondary }}
        >
          <MaterialIcons
            name="attach-file"
            size={22}
            color={colors.foreground}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.foreground }}
          >
            {selectedFileName ? "File selected" : "Choose a file"}
          </Text>
          <Text
            className="text-xs mt-1"
            style={{ color: colors.mutedForeground }}
            numberOfLines={1}
          >
            {selectedFileName
              ? selectedFileName
              : "Supported formats: PDF, DOCX, TXT, Markdown"}
          </Text>
        </View>
      </Pressable>

      <Text
        className="text-xs font-semibold mb-2"
        style={{ color: colors.mutedForeground }}
      >
        Or paste a link
      </Text>
      <TextInput
        className="w-full rounded-xl px-4 py-3 border"
        placeholder="https://example.com/document"
        placeholderTextColor={colors.mutedForeground}
        value={documentUrl}
        onChangeText={onChangeUrl}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.foreground,
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

export default SourceDocumentSection;
