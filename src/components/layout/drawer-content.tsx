import { MaterialIcons } from "@expo/vector-icons";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/providers/theme-provider";
import ThemeToggle from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth";

type DrawerRouteName = "index" | "explore" | "profile";

interface DrawerRouteConfig {
  name: DrawerRouteName;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const DRAWER_ROUTES: DrawerRouteConfig[] = [
  { name: "index", label: "Home", icon: "home" },
  { name: "explore", label: "Explore", icon: "explore" },
  { name: "profile", label: "Profile", icon: "person" },
];

interface DrawerItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const DrawerItem = ({ icon, label, isActive, onPress }: DrawerItemProps) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="flex-row items-center py-2.5 px-4 mx-2 my-0.5 rounded-lg"
        style={{
          backgroundColor: isActive ? colors.primary + "15" : "transparent",
          borderLeftWidth: isActive ? 4 : 0,
          borderLeftColor: colors.primary,
        }}
      >
        <MaterialIcons
          name={icon}
          size={24}
          color={isActive ? colors.primary : colors.mutedForeground}
          className="mr-4"
        />
        <Text
          className="text-base flex-1"
          style={{
            color: isActive ? colors.primary : colors.foreground,
            fontWeight: isActive ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const DrawerContent = (props: DrawerContentComponentProps) => {
  const { colors } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();

  const handleNavigate = (routeName: DrawerRouteName) => {
    navigation.closeDrawer();
    navigation.navigate(routeName);
  };

  const currentRoute = state.routes[state.index]?.name;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header Section */}
      <View
        className="pt-14 pb-4 px-4 border-b"
        style={{
          backgroundColor: colors.primary,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-start">
          <View
            className="w-12 h-12 rounded-full justify-center items-center mr-3"
            style={{ backgroundColor: colors.primaryForeground + "30" }}
          >
            <MaterialIcons
              name="account-circle"
              size={40}
              color={colors.primaryForeground}
            />
          </View>
          <View className="flex-1">
            <Text
              className="text-lg font-bold"
              style={{ color: colors.primaryForeground }}
              numberOfLines={1}
            >
              {isAuthenticated && user
                ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
                : "Guest"}
            </Text>
            <Text
              className="text-sm"
              style={{ color: colors.primaryForeground + "CC" }}
              numberOfLines={1}
            >
              {isAuthenticated && user ? user.email : "Please log in to continue"}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
      >
        <View className="py-2">
          <Text
            className="text-xs font-bold uppercase tracking-wider px-4 py-1.5"
            style={{ color: colors.mutedForeground }}
          >
            NAVIGATION
          </Text>
          {DRAWER_ROUTES.map((route) => (
            <DrawerItem
              key={route.name}
              icon={route.icon}
              label={route.label}
              isActive={currentRoute === route.name}
              onPress={() => handleNavigate(route.name)}
            />
          ))}
        </View>

        {/* Settings Section */}
        <View
          className="py-2.5 border-t"
          style={{ borderTopColor: "#00000010" }}
        >
          <Text
            className="text-xs font-bold uppercase tracking-wider px-4 py-1.5"
            style={{ color: colors.mutedForeground }}
          >
            SETTINGS
          </Text>

          {/* Theme Toggle */}
          <ThemeToggle />
        </View>
      </ScrollView>

      {/* Logout Section */}
      {isAuthenticated && (
        <View className="px-4 pb-2">
          <Pressable
            onPress={logout}
            className="flex-row items-center justify-center py-3.5 rounded-xl border"
            style={{
              backgroundColor: colors.error + "20",
              borderColor: colors.error + "40",
            }}
          >
            <MaterialIcons
              name="logout"
              size={22}
              color={colors.error}
              className="mr-2"
            />
            <Text
              className="text-base font-semibold"
              style={{ color: colors.error }}
            >
              Logout
            </Text>
          </Pressable>
        </View>
      )}

      {/* Footer */}
      <View
        className="px-4 pt-3 border-t"
        style={{
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 12 + insets.bottom,
        }}
      >
        <View className="flex-row items-center justify-center">
          <MaterialIcons
            name="psychology"
            size={18}
            color={colors.primary}
            className="mr-1.5"
          />
          <Text
            className="text-xs"
            style={{ color: colors.mutedForeground }}
          >
            Mind Mapping App v1.0
          </Text>
        </View>
      </View>
    </View>
  );
}

export default DrawerContent;
