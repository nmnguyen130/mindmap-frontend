import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/components/providers/theme-provider";

interface ConnectionModeOverlayProps {
  visible: boolean;
  sourceNodeLabel?: string | null;
  onCancel: () => void;
}

const ConnectionModeOverlay = ({
  visible,
  sourceNodeLabel = null,
  onCancel,
}: ConnectionModeOverlayProps) => {
  const { colors } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(-100, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, translateY, opacity]);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const message = sourceNodeLabel
    ? `Now tap the target node to connect from "${sourceNodeLabel}"`
    : "Tap a node to select as connection source";

  return (
    <Animated.View style={[styles.container, bannerStyle]}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: colors.primary,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="link" size={20} color="#ffffff" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Connection Mode</Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onCancel}
          style={styles.cancelButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={20} color="#ffffff" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});

export default ConnectionModeOverlay;
