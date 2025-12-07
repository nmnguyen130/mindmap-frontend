import {
  matchFont,
  Matrix4,
  Rect,
  RoundedRect,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";
import {
  useAnimatedReaction,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { MindMapNode } from "@/features/mindmap";
import { getNodeBox } from "@/features/mindmap/utils/node-utils";

interface ViewportCullingProps {
  matrix: SharedValue<Matrix4>;
  nodes: MindMapNode[];
  screenSize: { width: number; height: number };
  children: (visibleNodes: MindMapNode[]) => React.ReactNode;
}

interface ViewportVisualizationProps {
  screenSize: { width: number; height: number };
}

const CULLING_MARGIN = 50;
const FONT_SIZE = 10;

const font = matchFont({
  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  fontSize: FONT_SIZE,
});

// Viewport visualization component
export const ViewportVisualization = ({
  screenSize,
}: ViewportVisualizationProps) => {
  const screenCenterX = screenSize.width / 2;
  const screenCenterY = screenSize.height / 2;

  // Screen coords for active culling area (viewport + margin)
  const activeViewportLeft =
    screenCenterX - (screenSize.width / 2 + CULLING_MARGIN);
  const activeViewportTop =
    screenCenterY - (screenSize.height / 2 + CULLING_MARGIN);
  const activeViewportWidth = screenSize.width + 2 * CULLING_MARGIN;
  const activeViewportHeight = screenSize.height + 2 * CULLING_MARGIN;

  return (
    <>
      {/* Active culling bounds - shows actual area being rendered */}
      <Rect
        x={activeViewportLeft}
        y={activeViewportTop}
        width={activeViewportWidth}
        height={activeViewportHeight}
        color="rgba(239, 68, 68, 0.05)"
      />

      <Rect
        x={activeViewportLeft}
        y={activeViewportTop}
        width={activeViewportWidth}
        height={activeViewportHeight}
        color="#ef4444"
        style="stroke"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Main viewport rectangle */}
      <RoundedRect
        x={screenCenterX - screenSize.width / 2}
        y={screenCenterY - screenSize.height / 2}
        width={screenSize.width}
        height={screenSize.height}
        r={4}
        color="rgba(59, 130, 246, 0.1)"
      />

      {/* Viewport border */}
      <RoundedRect
        x={screenCenterX - screenSize.width / 2}
        y={screenCenterY - screenSize.height / 2}
        width={screenSize.width}
        height={screenSize.height}
        r={4}
        color="#3b82f6"
        style="stroke"
        strokeWidth={2}
      />

      {/* Label */}
      <Text
        x={screenCenterX - screenSize.width / 2 + 8}
        y={screenCenterY - screenSize.height / 2 + 16}
        text="Viewport"
        font={font}
        color="#3b82f6"
      />
    </>
  );
};

const ViewportCulling = ({
  matrix,
  nodes,
  screenSize,
  children,
}: ViewportCullingProps) => {
  const screenWidth = screenSize.width;
  const screenHeight = screenSize.height;

  const [visibleNodesState, setVisibleNodesState] =
    React.useState<MindMapNode[]>(nodes);

  // Pre-calculate bounding boxes to avoid Skia calls in worklet
  const precomputedNodeBoxes = React.useMemo(() => {
    const boxes = new Map<
      string,
      { left: number; right: number; top: number; bottom: number }
    >();
    for (const node of nodes) {
      boxes.set(node.id, getNodeBox(node));
    }
    return boxes;
  }, [nodes]);

  const visibleNodes = useDerivedValue(() => {
    "worklet";

    if (!matrix.value) return nodes;

    // Get camera transform from matrix
    const currentScale = matrix.value[0] || 1;
    const cameraTranslateX = matrix.value[3] || 0;
    const cameraTranslateY = matrix.value[7] || 0;

    // Calculate viewport center position on screen
    const viewportCenterX = screenWidth / 2;
    const viewportCenterY = screenHeight / 2;

    // Convert screen viewport to world coordinates
    const worldViewportLeft =
      (viewportCenterX - screenWidth / 2 - cameraTranslateX) / currentScale;
    const worldViewportRight =
      (viewportCenterX + screenWidth / 2 - cameraTranslateX) / currentScale;
    const worldViewportTop =
      (viewportCenterY - screenHeight / 2 - cameraTranslateY) / currentScale;
    const worldViewportBottom =
      (viewportCenterY + screenHeight / 2 - cameraTranslateY) / currentScale;

    // Add margin for smooth scrolling
    const worldMargin = CULLING_MARGIN / currentScale;

    // Final culling area
    const cullingBounds = {
      left: worldViewportLeft - worldMargin,
      right: worldViewportRight + worldMargin,
      top: worldViewportTop - worldMargin,
      bottom: worldViewportBottom + worldMargin,
    };

    // Filter nodes inside culling area
    const filteredNodes = nodes.filter((node) => {
      const nodeBounds = precomputedNodeBoxes.get(node.id);
      if (!nodeBounds) return false;

      // AABB collision check
      return (
        nodeBounds.right >= cullingBounds.left &&
        nodeBounds.left <= cullingBounds.right &&
        nodeBounds.bottom >= cullingBounds.top &&
        nodeBounds.top <= cullingBounds.bottom
      );
    });

    return filteredNodes;
  });

  // Sync worklet data to React
  useAnimatedReaction(
    () => visibleNodes.value,
    (currentVisibleNodes, previousVisibleNodes) => {
      if (currentVisibleNodes !== previousVisibleNodes) {
        scheduleOnRN(setVisibleNodesState, currentVisibleNodes);
      }
    }
  );

  return children(visibleNodesState);
};

export default React.memo(ViewportCulling);
