import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";

const ThemeToggle = () => {
  const { colors, isDark, setTheme } = useTheme();

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Pressable
      onPress={handleToggleTheme}
      className="flex-row items-center px-4 py-3 mx-2 my-0.5 rounded-lg"
      style={{ backgroundColor: "transparent" }}
    >
      <MaterialIcons
        name={isDark ? "light-mode" : "dark-mode"}
        size={24}
        color={colors.mutedForeground}
        className="mr-4"
      />
      <Text
        className="text-base flex-1"
        style={{ color: colors.foreground }}
      >
        {isDark ? "Light Mode" : "Dark Mode"}
      </Text>
      <View className="flex-1" />
      <View
        className="w-14 h-7 rounded-full px-1 justify-center"
        style={{
          backgroundColor: isDark ? colors.primary : colors.secondary,
        }}
      >
        <View
          className="w-5 h-5 rounded-full"
          style={{
            backgroundColor: colors.primaryForeground,
            transform: [{ translateX: isDark ? 24 : 0 }],
          }}
        />
      </View>
    </Pressable>
  );
};

export default ThemeToggle;
