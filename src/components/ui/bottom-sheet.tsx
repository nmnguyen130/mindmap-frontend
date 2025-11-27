import { ReactNode, useEffect } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "@/components/providers/theme-provider";

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: number;
  snapRatio?: number; // 0-1, fraction of window height
}

const SHEET_HIDDEN_OFFSET = 360;

const BottomSheet = ({
  visible,
  title,
  onClose,
  children,
  maxHeight,
  snapRatio = 0.6,
}: BottomSheetProps) => {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const translateY = useSharedValue(SHEET_HIDDEN_OFFSET);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 220 });
      overlayOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(SHEET_HIDDEN_OFFSET, { duration: 200 });
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, overlayOpacity]);

  const handleClose = () => {
    if (!visible) return;
    onClose();
  };

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      "worklet";
      const shouldClose = event.translationY > 120 || event.velocityY > 600;

      if (shouldClose) {
        scheduleOnRN(onClose);
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      className="absolute inset-0 justify-end"
      pointerEvents={visible ? "auto" : "none"}
      style={[{ backgroundColor: "rgba(0,0,0,0.35)" }, overlayStyle]}
    >
      <Pressable className="flex-1" onPress={handleClose} />

      <GestureDetector gesture={dragGesture}>
        <Animated.View
          className="px-4 pb-6 pt-3 rounded-t-3xl"
          style={[
            {
              backgroundColor: colors.surface,
              maxHeight: maxHeight ?? windowHeight * snapRatio,
            },
            sheetStyle,
          ]}
        >
          <View
            className="w-14 h-1.5 rounded-full self-center mb-3"
            style={{ backgroundColor: colors.border }}
          />
          {title && (
            <Text
              className="text-xs font-semibold uppercase mb-3 text-center"
              style={{ color: colors.mutedForeground }}
            >
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default BottomSheet;
