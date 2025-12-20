import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/components/providers/theme-provider";

interface SourceDocumentSectionProps {
  selectedFileName: string | null;
  onPickFile: () => void;
  onClearFile?: () => void;
}

/**
 * Source document section for optional PDF upload.
 * Beautiful gradient card design.
 */
const SourceDocumentSection = ({
  selectedFileName,
  onPickFile,
  onClearFile,
}: SourceDocumentSectionProps) => {
  const { colors, isDark } = useTheme();

  const hasFile = !!selectedFileName;

  /*
   * Gradient colors:
   * - Blue/purple for empty state
   * - Green when file is selected
   */
  const gradientColors: [string, string] = hasFile
    ? isDark
      ? ["#059669", "#047857"]
      : ["#10b981", "#059669"]
    : isDark
      ? ["#1e3a8a", "#312e81"]
      : ["#3b82f6", "#8b5cf6"];

  return (
    <View className="mb-4">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
          <Text
            className="text-sm font-medium ml-2"
            style={{ color: colors.foreground }}
          >
            AI Source
          </Text>
        </View>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text className="text-xs" style={{ color: colors.mutedForeground }}>
            Optional
          </Text>
        </View>
      </View>

      {/* File Picker Card */}
      <Pressable
        onPress={onPickFile}
        style={{ borderRadius: 16, overflow: "hidden" }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderRadius: 16,
          }}
        >
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <MaterialIcons
              name={hasFile ? "check-circle" : "cloud-upload"}
              size={26}
              color="#ffffff"
            />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: "#ffffff" }}>
              {hasFile ? "PDF Selected" : "Upload PDF"}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.85)" }}
              numberOfLines={1}
            >
              {hasFile ? selectedFileName : "Let AI generate your mindmap"}
            </Text>
          </View>

          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <MaterialIcons
              name={hasFile ? "swap-horiz" : "add"}
              size={20}
              color="#ffffff"
            />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Clear file button */}
      {hasFile && onClearFile && (
        <Pressable
          onPress={onClearFile}
          className="flex-row items-center justify-center mt-3 py-2"
        >
          <MaterialIcons
            name="close"
            size={14}
            color={colors.mutedForeground}
          />
          <Text
            className="text-xs ml-1"
            style={{ color: colors.mutedForeground }}
          >
            Remove file
          </Text>
        </Pressable>
      )}

      {/* Hint for blank mindmap */}
      {!hasFile && (
        <View
          className="flex-row items-center mt-3 p-3 rounded-xl"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
          }}
        >
          <MaterialIcons
            name="lightbulb-outline"
            size={16}
            color={colors.mutedForeground}
          />
          <Text
            className="text-xs ml-2 flex-1"
            style={{ color: colors.mutedForeground }}
          >
            Skip this to create a blank mindmap
          </Text>
        </View>
      )}
    </View>
  );
};

export default SourceDocumentSection;
