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

interface CanvasGestureHandlerProps {
  children: (
    matrix: SharedValue<Matrix4>,
    focalPoint: SharedValue<{ x: number; y: number }>
  ) => React.ReactNode;
  onSingleTap?: (x: number, y: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const GestureHandler = ({
  children,
  onSingleTap,
  onInteractionStart,
  onInteractionEnd,
}: CanvasGestureHandlerProps) => {
  const currentPosition = useSharedValue({ x: 0, y: 0 });
  const lastPosition = useSharedValue({ x: 0, y: 0 });

  const currentScale = useSharedValue(1);
  const lastScale = useSharedValue(1);

  const focalPoint = useSharedValue({ x: 0, y: 0 });
  const isPinching = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      if (onInteractionStart) {
        scheduleOnRN(onInteractionStart);
      }
    })
    .onUpdate((e) => {
      "worklet";
      if (isPinching.value) return;
      currentPosition.value = {
        x: lastPosition.value.x + e.translationX,
        y: lastPosition.value.y + e.translationY,
      };
    })
    .onEnd(() => {
      "worklet";
      if (isPinching.value) return;
      lastPosition.value = currentPosition.value;
      if (onInteractionEnd) {
        scheduleOnRN(onInteractionEnd);
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      "worklet";
      focalPoint.value = { x: e.focalX, y: e.focalY };
      isPinching.value = true;
      // Capture baselines at gesture start to avoid compounding/jumps
      lastScale.value = currentScale.value;
      // Sync lastPosition to current at start (fix baseline mismatch)
      lastPosition.value = currentPosition.value;
      if (onInteractionStart) {
        scheduleOnRN(onInteractionStart);
      }
    })
    .onUpdate((e) => {
      "worklet";
      // keep focal point updated while pinching for accurate overlay and math
      focalPoint.value = { x: e.focalX, y: e.focalY };

      // Compute from last baselines to avoid compounding
      const zoom_sensitivity = 1;
      const raw_scale = 1 + (e.scale - 1) * zoom_sensitivity;
      const nextScale = clamp(lastScale.value * raw_scale, 0.5, 3);

      // Compute world coordinates under current focal point for smooth scaling
      const worldX =
        (focalPoint.value.x - currentPosition.value.x) / currentScale.value;
      const worldY =
        (focalPoint.value.y - currentPosition.value.y) / currentScale.value;

      currentPosition.value = {
        x: focalPoint.value.x - worldX * nextScale,
        y: focalPoint.value.y - worldY * nextScale,
      };

      currentScale.value = nextScale;
    })
    .onEnd(() => {
      "worklet";
      isPinching.value = false;
      // Sync lastPosition for next pan (prevents jump if pan continues/resumes)
      lastPosition.value = currentPosition.value;
      if (onInteractionEnd) {
        scheduleOnRN(onInteractionEnd);
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDelay(200)
    .onEnd((e) => {
      "worklet";

      const screenX = e.x;
      const screenY = e.y;
      const worldX = (screenX - currentPosition.value.x) / currentScale.value;
      const worldY = (screenY - currentPosition.value.y) / currentScale.value;

      if (onSingleTap) {
        scheduleOnRN(onSingleTap, worldX, worldY);
      }
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  // Create Skia matrix for canvas transformation with focal pivot
  const canvasMatrix = useDerivedValue(() => {
    "worklet";
    return processTransform3d([
      { translateX: currentPosition.value.x },
      { translateY: currentPosition.value.y },
      { scale: currentScale.value },
    ]);
  });

  return (
    <GestureDetector gesture={gesture}>
      {children(canvasMatrix, focalPoint)}
    </GestureDetector>
  );
};

export default GestureHandler;
