import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export interface QuickActionButtonProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  backgroundColor: string;
  titleColor: string;
  descriptionColor: string;
  iconColor: string;
  onPress: () => void;
  compact?: boolean;
}

const QuickActionButton = ({
  title,
  description,
  icon,
  backgroundColor,
  titleColor,
  descriptionColor,
  iconColor,
  onPress,
  compact,
}: QuickActionButtonProps) => {
  const paddingClass = compact ? "p-3" : "p-4";
  const iconSize = compact ? 22 : 24;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between ${paddingClass} rounded-xl mb-3`}
      style={{ backgroundColor }}
    >
      <View className="flex-1 mr-3">
        <Text
          className="text-base font-semibold mb-1"
          style={{ color: titleColor }}
        >
          {title}
        </Text>
        <Text className="text-xs" style={{ color: descriptionColor }}>
          {description}
        </Text>
      </View>
      <MaterialIcons name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

export default QuickActionButton;
