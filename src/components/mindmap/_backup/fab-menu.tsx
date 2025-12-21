import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/components/providers/theme-provider";

export interface FABAction {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FABMenuProps {
  actions: FABAction[];
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const FABMenu = ({ actions, disabled = false }: FABMenuProps) => {
  const { colors, isDark } = useTheme();
  const isExpanded = useSharedValue(0);

  const toggleMenu = useCallback(() => {
    isExpanded.value = withSpring(
      isExpanded.value === 0 ? 1 : 0,
      SPRING_CONFIG
    );
  }, [isExpanded]);

  const handleActionPress = useCallback(
    (action: FABAction) => {
      isExpanded.value = withSpring(0, SPRING_CONFIG);
      action.onPress();
    },
    [isExpanded]
  );

  // Main FAB button animation
  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(isExpanded.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  // Backdrop animation
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isExpanded.value, [0, 1], [0, 0.5]),
    pointerEvents: isExpanded.value > 0.5 ? "auto" : "none",
  }));

  // Generate styles for each action button
  const getActionStyle = (index: number, total: number) => {
    return useAnimatedStyle(() => {
      const offset = (total - index) * 60;
      return {
        transform: [
          {
            translateY: interpolate(isExpanded.value, [0, 1], [0, -offset]),
          },
          {
            scale: interpolate(isExpanded.value, [0, 0.5, 1], [0, 0.5, 1]),
          },
        ],
        opacity: interpolate(isExpanded.value, [0, 0.5, 1], [0, 0, 1]),
      };
    });
  };

  const gradientColors: [string, string] = isDark
    ? ["#6366f1", "#8b5cf6"]
    : ["#3b82f6", "#6366f1"];

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
      </Animated.View>

      {/* FAB Container */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Action Buttons */}
        {actions.map((action, index) => (
          <Animated.View
            key={action.id}
            style={[styles.actionButton, getActionStyle(index, actions.length)]}
          >
            <Pressable
              onPress={() => handleActionPress(action)}
              style={[
                styles.actionPressable,
                {
                  backgroundColor: action.color || colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={action.icon}
                size={22}
                color={action.color ? "#ffffff" : colors.primary}
              />
            </Pressable>
          </Animated.View>
        ))}

        {/* Main FAB Button */}
        <Pressable
          onPress={toggleMenu}
          disabled={disabled}
          style={[styles.mainButton, disabled && styles.disabled]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainButtonGradient}
          >
            <Animated.View style={mainButtonStyle}>
              <MaterialIcons name="add" size={28} color="#ffffff" />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "center",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    position: "absolute",
    bottom: 0,
  },
  actionPressable: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FABMenu;
