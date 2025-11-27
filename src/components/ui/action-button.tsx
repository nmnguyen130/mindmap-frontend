import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/components/providers/theme-provider";

type ActionButtonVariant = "primary" | "success" | "warning" | "surface" | "danger";

export interface ActionButtonProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: ActionButtonVariant;
  onPress: () => void;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

const ActionButton = ({
  title,
  description,
  icon,
  variant = "surface",
  onPress,
  compact,
  className,
  disabled,
}: ActionButtonProps) => {
  const { colors } = useTheme();
  const paddingClass = compact ? "p-3" : "p-4";
  const iconSize = compact ? 22 : 24;

  let backgroundColor: string;
  let titleColor: string;
  let descriptionColor: string;
  let iconColor: string;
  let hasBorder = false;

  switch (variant) {
    case "primary": {
      backgroundColor = colors.primary;
      titleColor = colors.primaryForeground;
      descriptionColor = colors.primaryForeground;
      iconColor = colors.primaryForeground;
      break;
    }
    case "success": {
      backgroundColor = colors.success;
      titleColor = "#ffffff";
      descriptionColor = "#ffffff";
      iconColor = "#ffffff";
      break;
    }
    case "warning": {
      backgroundColor = colors.warning;
      titleColor = "#ffffff";
      descriptionColor = "#ffffff";
      iconColor = "#ffffff";
      break;
    }
    case "danger": {
      backgroundColor = colors.background;
      titleColor = colors.error;
      descriptionColor = colors.mutedForeground;
      iconColor = colors.error;
      hasBorder = true;
      break;
    }
    case "surface":
    default: {
      backgroundColor = colors.surface;
      titleColor = colors.surfaceForeground;
      descriptionColor = colors.mutedForeground;
      iconColor = colors.surfaceForeground;
      hasBorder = true;
      break;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center ${icon ? 'justify-between' : 'justify-center'} ${paddingClass} rounded-xl ${className ?? ""}`}
      style={{
        backgroundColor,
        borderColor: hasBorder ? colors.border : undefined,
        borderWidth: hasBorder ? 1 : 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View className={icon ? "flex-1 mr-3" : "items-center"}>
        <Text
          className="text-base font-semibold mb-1"
          style={{ color: titleColor }}
        >
          {title}
        </Text>
        {description ? (
          <Text className="text-xs" style={{ color: descriptionColor }}>
            {description}
          </Text>
        ) : null}
      </View>
      {icon && (
        <MaterialIcons name={icon} size={iconSize} color={iconColor} />
      )}
    </Pressable>
  );
};

export default ActionButton;

