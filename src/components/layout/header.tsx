import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StatusBar, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/providers/theme-provider";
import { SyncStatusIndicator } from "@/components/sync-status";

interface HeaderProps {
  title: string;
  onMenuPress: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
  };
}

const Header = ({
  title,
  onMenuPress,
  showBackButton = false,
  onBackPress,
  rightAction,
}: HeaderProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const menuScale = useSharedValue(1);
  const rightScale = useSharedValue(1);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
  }));

  const rightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale.value }],
  }));

  const handleMenuPressIn = () => {
    menuScale.value = withSpring(0.85);
  };

  const handleMenuPressOut = () => {
    menuScale.value = withSpring(1);
  };

  const handleRightPressIn = () => {
    rightScale.value = withSpring(0.85);
  };

  const handleRightPressOut = () => {
    rightScale.value = withSpring(1);
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <View
        className="border-b"
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between px-4 py-3 h-14">
          {/* Left Action - Menu or Back Button */}
          <Animated.View style={menuAnimatedStyle}>
            <Pressable
              onPress={showBackButton ? onBackPress : onMenuPress}
              onPressIn={handleMenuPressIn}
              onPressOut={handleMenuPressOut}
              className="w-10 h-10 rounded-full justify-center items-center"
              style={{ backgroundColor: colors.surface }}
              accessibilityLabel={showBackButton ? "Go back" : "Open menu"}
              accessibilityRole="button"
            >
              <MaterialIcons
                name={showBackButton ? "arrow-back" : "menu"}
                size={24}
                color={colors.foreground}
              />
            </Pressable>
          </Animated.View>

          {/* Title */}
          <View className="flex-1 items-center justify-center px-4">
            <Text
              className="text-xl font-bold"
              style={{ color: colors.foreground }}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>

          {/* Right Section - Sync Status + Optional Action */}
          <View className="flex-row items-center gap-2">
            {/* Sync Status Indicator */}
            <SyncStatusIndicator />

            {/* Optional Right Action */}
            {rightAction && (
              <Animated.View style={rightAnimatedStyle}>
                <Pressable
                  onPress={rightAction.onPress}
                  onPressIn={handleRightPressIn}
                  onPressOut={handleRightPressOut}
                  className="w-10 h-10 rounded-full justify-center items-center"
                  style={{ backgroundColor: colors.surface }}
                  accessibilityLabel="Action button"
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={rightAction.icon}
                    size={24}
                    color={colors.primary}
                  />
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

export default Header;
