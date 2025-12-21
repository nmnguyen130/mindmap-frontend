import { Matrix4, processTransform3d } from "@shopify/react-native-skia";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  clamp,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Types

interface GestureHandlerProps {
  children: (matrix: SharedValue<Matrix4>) => React.ReactNode;
  /** Shared value: set to true from JS when pan should drag node instead of canvas */
  isDraggingNode: SharedValue<boolean>;
  onTap?: (worldX: number, worldY: number) => void;
  onDrag?: (worldX: number, worldY: number) => void;
  onDragEnd?: () => void;
}

const GestureHandler = ({
  children,
  isDraggingNode,
  onTap,
  onDrag,
  onDragEnd,
}: GestureHandlerProps) => {
  // Canvas transform
  const position = useSharedValue({ x: 0, y: 0 });
  const savedPosition = useSharedValue({ x: 0, y: 0 });
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const isPinching = useSharedValue(false);

  // Convert screen to world
  const screenToWorld = (screenX: number, screenY: number) => {
    "worklet";
    return {
      x: (screenX - position.value.x) / scale.value,
      y: (screenY - position.value.y) / scale.value,
    };
  };

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      "worklet";
      const world = screenToWorld(e.x, e.y);
      if (onTap) scheduleOnRN(onTap, world.x, world.y);
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      savedPosition.value = position.value;
    })
    .onUpdate((e) => {
      "worklet";
      if (isPinching.value) return;

      if (isDraggingNode.value) {
        const world = screenToWorld(e.absoluteX, e.absoluteY);
        if (onDrag) scheduleOnRN(onDrag, world.x, world.y);
      } else {
        position.value = {
          x: savedPosition.value.x + e.translationX,
          y: savedPosition.value.y + e.translationY,
        };
      }
    })
    .onEnd(() => {
      "worklet";
      if (isDraggingNode.value && onDragEnd) {
        scheduleOnRN(onDragEnd);
      }
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      isPinching.value = true;
      savedScale.value = scale.value;
      savedPosition.value = position.value;
    })
    .onUpdate((e) => {
      "worklet";
      const nextScale = clamp(savedScale.value * e.scale, 0.5, 3);
      const focal = { x: e.focalX, y: e.focalY };
      const worldX = (focal.x - position.value.x) / scale.value;
      const worldY = (focal.y - position.value.y) / scale.value;
      position.value = {
        x: focal.x - worldX * nextScale,
        y: focal.y - worldY * nextScale,
      };
      scale.value = nextScale;
    })
    .onEnd(() => {
      "worklet";
      isPinching.value = false;
    });

  const gesture = Gesture.Simultaneous(
    Gesture.Race(panGesture, tapGesture),
    pinchGesture
  );

  const matrix = useDerivedValue(() => {
    "worklet";
    return processTransform3d([
      { translateX: position.value.x },
      { translateY: position.value.y },
      { scale: scale.value },
    ]);
  });

  return (
    <GestureDetector gesture={gesture}>{children(matrix)}</GestureDetector>
  );
};

export default GestureHandler;
