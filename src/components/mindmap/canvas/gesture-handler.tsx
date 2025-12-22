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
  isDraggingNode: SharedValue<boolean>;
  activeNodeId: SharedValue<string | null>;
  nodePositions: Map<
    string,
    { x: SharedValue<number>; y: SharedValue<number> }
  >;
  onTap?: (worldX: number, worldY: number) => void;
  onDragEnd?: () => void;
}

const GestureHandler = ({
  children,
  isDraggingNode,
  activeNodeId,
  nodePositions,
  onTap,
  onDragEnd,
}: GestureHandlerProps) => {
  // Canvas transform
  const position = useSharedValue({ x: 0, y: 0 });
  const savedPosition = useSharedValue({ x: 0, y: 0 });
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const isPinching = useSharedValue(false);

  // Drag offset (difference between tap point and node center)
  const dragOffset = useSharedValue({ x: 0, y: 0 });

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
    .onStart((e) => {
      "worklet";
      savedPosition.value = position.value;

      // Store offset between tap and node center
      if (isDraggingNode.value && activeNodeId.value) {
        const pos = nodePositions.get(activeNodeId.value);
        if (pos) {
          const world = screenToWorld(e.absoluteX, e.absoluteY);
          dragOffset.value = {
            x: pos.x.value - world.x,
            y: pos.y.value - world.y,
          };
        }
      }
    })
    .onUpdate((e) => {
      "worklet";
      if (isDraggingNode.value && activeNodeId.value) {
        const world = screenToWorld(e.absoluteX, e.absoluteY);
        const pos = nodePositions.get(activeNodeId.value);
        if (pos) {
          // Apply stored offset to keep node at same relative position
          pos.x.value = world.x + dragOffset.value.x;
          pos.y.value = world.y + dragOffset.value.y;
        }
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
