import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Matrix4, processTransform3d, translate } from "@shopify/react-native-skia";
import { type SharedValue, useSharedValue, useDerivedValue } from "react-native-reanimated";

interface CanvasGestureHandlerProps {
  children: (matrix: SharedValue<Matrix4>) => React.ReactNode;
}

export const CanvasGestureHandler = ({ children }: CanvasGestureHandlerProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Create Skia matrix for canvas transformation
  const canvasMatrix = useDerivedValue(() => {
    return processTransform3d([
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ]);
  });

  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    });

  const pinchGesture = Gesture.Pinch()
    .onChange((e) => {
      scale.value *= e.scaleChange;
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

  return (
    <GestureDetector gesture={gesture}>
      {children(canvasMatrix)}
    </GestureDetector>
  );
};
