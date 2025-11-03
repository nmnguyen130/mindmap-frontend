import { Matrix4, processTransform3d } from "@shopify/react-native-skia";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  clamp,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

interface CanvasGestureHandlerProps {
  children: (
    matrix: SharedValue<Matrix4>,
    focalPoint: SharedValue<{ x: number; y: number }>
  ) => React.ReactNode;
}

export const CanvasGestureHandler = ({
  children,
}: CanvasGestureHandlerProps) => {
  const currentPosition = useSharedValue({ x: 0, y: 0 });
  const lastPosition = useSharedValue({ x: 0, y: 0 });

  const currentScale = useSharedValue(1);
  const lastScale = useSharedValue(1);

  const focalPoint = useSharedValue({ x: 0, y: 0 });
  const isPinching = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (isPinching.value) return;
      currentPosition.value = {
        x: lastPosition.value.x + e.translationX,
        y: lastPosition.value.y + e.translationY,
      };
      console.log(`Pan: pos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)}), scale=${currentScale.value.toFixed(2)}`);
    })
    .onEnd(() => {
      "worklet";
      if (isPinching.value) return;
      lastPosition.value = currentPosition.value;
      console.log(`Pan end: saved pos=(${lastPosition.value.x.toFixed(0)}, ${lastPosition.value.y.toFixed(0)})`);
    });

  const pinchGesture = Gesture.Pinch()
  .onStart((e) => {
    "worklet";
    focalPoint.value = { x: e.focalX, y: e.focalY };
    isPinching.value = true;
    // Capture baselines at gesture start to avoid compounding/jump
    lastScale.value = currentScale.value;
    lastPosition.value = currentPosition.value;
    console.log(`Pinch start: fixedFocal=(${focalPoint.value.x.toFixed(0)}, ${focalPoint.value.y.toFixed(0)}), baselineScale=${lastScale.value.toFixed(2)}, baselinePos=(${lastPosition.value.x.toFixed(0)}, ${lastPosition.value.y.toFixed(0)})`);
  })
  .onUpdate((e) => {
    "worklet";
    const nextScale = clamp(lastScale.value * e.scale, 0.5, 3);
    const scaleFactor = nextScale / lastScale.value;

    const fp = focalPoint.value;
    const pos = lastPosition.value;

    currentPosition.value = {
      x: fp.x - (fp.x - pos.x) * scaleFactor,
      y: fp.y - (fp.y - pos.y) * scaleFactor,
    };

    currentScale.value = nextScale;
    console.log(`Pinch: scale=${nextScale.toFixed(2)}, fixedFocal=(${fp.x.toFixed(0)}, ${fp.y.toFixed(0)}), pos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)})`);
  })
  .onEnd(() => {
    "worklet";
    isPinching.value = false;
    // Update baseline position for subsequent pan gestures
    lastPosition.value = currentPosition.value;
    console.log(`Pinch end: finalScale=${currentScale.value.toFixed(2)}, finalPos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)})`);
  });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

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


// import { Matrix4, processTransform3d } from "@shopify/react-native-skia";
// import React from "react";
// import { Gesture, GestureDetector } from "react-native-gesture-handler";
// import {
//   clamp,
//   type SharedValue,
//   useDerivedValue,
//   useSharedValue,
// } from "react-native-reanimated";

// interface CanvasGestureHandlerProps {
//   children: (
//     matrix: SharedValue<Matrix4>,
//     focalPoint: SharedValue<{ x: number; y: number }>
//   ) => React.ReactNode;
// }

// export const CanvasGestureHandler = ({
//   children,
// }: CanvasGestureHandlerProps) => {
//   const currentPosition = useSharedValue({ x: 0, y: 0 });
//   const lastPosition = useSharedValue({ x: 0, y: 0 });

//   const currentScale = useSharedValue(1);
//   const lastScale = useSharedValue(1);

//   const focalPoint = useSharedValue({ x: 0, y: 0 });
//   const isPinching = useSharedValue(false);

//   const panGesture = Gesture.Pan()
//     .onUpdate((e) => {
//       "worklet";
//       if (isPinching.value) return;
//       currentPosition.value = {
//         x: lastPosition.value.x + e.translationX,
//         y: lastPosition.value.y + e.translationY,
//       };
//       console.log(`Pan: pos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)}), scale=${currentScale.value.toFixed(2)}`);
//     })
//     .onEnd(() => {
//       "worklet";
//       if (isPinching.value) return;
//       lastPosition.value = currentPosition.value;
//       console.log(`Pan end: saved pos=(${lastPosition.value.x.toFixed(0)}, ${lastPosition.value.y.toFixed(0)})`);
//     });

//   const pinchGesture = Gesture.Pinch()
//     .onStart((e) => {
//       "worklet";
//       focalPoint.value = { x: e.focalX, y: e.focalY };
//       isPinching.value = true;
//       // Capture baselines at gesture start to avoid compounding/jumps
//       lastScale.value = currentScale.value;
//       // Sync lastPosition to current at start (fix baseline mismatch)
//       lastPosition.value = currentPosition.value;
//       console.log(`Pinch start: focal=(${focalPoint.value.x.toFixed(0)}, ${focalPoint.value.y.toFixed(0)}), baselineScale=${lastScale.value.toFixed(2)}, baselinePos=(${lastPosition.value.x.toFixed(0)}, ${lastPosition.value.y.toFixed(0)})`);
//     })
//     .onUpdate((e) => {
//       "worklet";
//       // keep focal point updated while pinching for accurate overlay and math
//       focalPoint.value = { x: e.focalX, y: e.focalY };

//       // Compute from last baselines to avoid compounding
//       const zoom_sensitivity = 1;
//       const raw_scale = 1 + (e.scale - 1) * zoom_sensitivity;
//       const nextScale = clamp(lastScale.value * raw_scale, 0.5, 3);

//       // Use CURRENT position/scale to compute world coord under CURRENT focal (incremental, handles focal movement smoothly without drift)
//       const worldX = (focalPoint.value.x - currentPosition.value.x) / currentScale.value;
//       const worldY = (focalPoint.value.y - currentPosition.value.y) / currentScale.value;

//       currentPosition.value = {
//         x: focalPoint.value.x - worldX * nextScale,
//         y: focalPoint.value.y - worldY * nextScale,
//       };

//       currentScale.value = nextScale;
//       console.log(`Pinch: scale=${nextScale.toFixed(2)}, focal=(${focalPoint.value.x.toFixed(0)}, ${focalPoint.value.y.toFixed(0)}), pos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)})`);
//     })
//     .onEnd(() => {
//       "worklet";
//       isPinching.value = false;
//       // Sync lastPosition for next pan (prevents jump if pan continues/resumes)
//       lastPosition.value = currentPosition.value;
//       console.log(`Pinch end: finalScale=${currentScale.value.toFixed(2)}, finalPos=(${currentPosition.value.x.toFixed(0)}, ${currentPosition.value.y.toFixed(0)})`);
//     });

//   const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

//   // Create Skia matrix for canvas transformation with focal pivot
//   const canvasMatrix = useDerivedValue(() => {
//     "worklet";
//     return processTransform3d([
//       { translateX: currentPosition.value.x },
//       { translateY: currentPosition.value.y },
//       { scale: currentScale.value },
//     ]);
//   });

//   return (
//     <GestureDetector gesture={gesture}>
//       {children(canvasMatrix, focalPoint)}
//     </GestureDetector>
//   );
// };