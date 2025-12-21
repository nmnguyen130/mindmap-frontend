import {
  matchFont,
  Matrix4,
  Rect,
  RoundedRect,
  Text,
} from "@shopify/react-native-skia";
import React, { useRef } from "react";
import { Platform } from "react-native";
import { useAnimatedReaction, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { MindMapNode } from "@/features/mindmap";
import { getNodeBox } from "@/features/mindmap/utils/node-utils";

// Types

interface ViewportCullingProps {
  matrix: SharedValue<Matrix4>;
  nodes: MindMapNode[];
  screenSize: { width: number; height: number };
  children: (visibleNodes: MindMapNode[]) => React.ReactNode;
}

interface ViewportVisualizationProps {
  screenSize: { width: number; height: number };
}

// Constants

const CULLING_MARGIN = 100; // Larger margin = less pop-in
const UPDATE_THROTTLE_MS = 100; // Slower updates = smoother gestures
const FONT_SIZE = 10;

const font = matchFont({
  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  fontSize: FONT_SIZE,
});

// Debug visualization

export const ViewportVisualization = ({
  screenSize,
}: ViewportVisualizationProps) => {
  const cx = screenSize.width / 2;
  const cy = screenSize.height / 2;
  const m = CULLING_MARGIN;

  return (
    <>
      <Rect
        x={-m}
        y={-m}
        width={screenSize.width + 2 * m}
        height={screenSize.height + 2 * m}
        color="rgba(239, 68, 68, 0.05)"
      />
      <RoundedRect
        x={0}
        y={0}
        width={screenSize.width}
        height={screenSize.height}
        r={4}
        color="rgba(59, 130, 246, 0.1)"
      />
      <RoundedRect
        x={0}
        y={0}
        width={screenSize.width}
        height={screenSize.height}
        r={4}
        color="#3b82f6"
        style="stroke"
        strokeWidth={2}
      />
      <Text x={8} y={16} text="Viewport" font={font} color="#3b82f6" />
    </>
  );
};

// Viewport culling component

const ViewportCulling = ({
  matrix,
  nodes,
  screenSize,
  children,
}: ViewportCullingProps) => {
  const screenWidth = screenSize.width;
  const screenHeight = screenSize.height;

  // Start with all nodes visible
  const [visibleNodes, setVisibleNodes] = React.useState<MindMapNode[]>(nodes);

  // Throttling refs
  const lastUpdateTime = useRef(0);
  const lastVisibleIds = useRef<string>("");

  // Pre-compute bounding boxes once
  const nodeBoxes = React.useMemo(() => {
    const boxes = new Map<string, ReturnType<typeof getNodeBox>>();
    for (const node of nodes) {
      boxes.set(node.id, getNodeBox(node));
    }
    return boxes;
  }, [nodes]);

  // Update visible nodes (runs on JS thread)
  const updateVisibility = React.useCallback(
    (scale: number, translateX: number, translateY: number) => {
      const now = Date.now();
      if (now - lastUpdateTime.current < UPDATE_THROTTLE_MS) return;

      // Calculate world bounds
      const worldLeft = -translateX / scale - CULLING_MARGIN / scale;
      const worldRight =
        (screenWidth - translateX) / scale + CULLING_MARGIN / scale;
      const worldTop = -translateY / scale - CULLING_MARGIN / scale;
      const worldBottom =
        (screenHeight - translateY) / scale + CULLING_MARGIN / scale;

      // Filter visible nodes
      const visible: MindMapNode[] = [];
      for (const node of nodes) {
        const box = nodeBoxes.get(node.id);
        if (!box) continue;

        if (
          box.right >= worldLeft &&
          box.left <= worldRight &&
          box.bottom >= worldTop &&
          box.top <= worldBottom
        ) {
          visible.push(node);
        }
      }

      // Only update if changed
      const visibleIdsStr = visible.map((n) => n.id).join(",");
      if (visibleIdsStr !== lastVisibleIds.current) {
        lastVisibleIds.current = visibleIdsStr;
        lastUpdateTime.current = now;
        setVisibleNodes(visible);
      }
    },
    [nodes, nodeBoxes, screenWidth, screenHeight]
  );

  // React to matrix changes
  useAnimatedReaction(
    () => ({
      scale: matrix.value?.[0] ?? 1,
      tx: matrix.value?.[3] ?? 0,
      ty: matrix.value?.[7] ?? 0,
    }),
    (current) => {
      scheduleOnRN(updateVisibility, current.scale, current.tx, current.ty);
    }
  );

  // Sync when nodes change
  React.useEffect(() => {
    setVisibleNodes(nodes);
    lastVisibleIds.current = "";
  }, [nodes]);

  return children(visibleNodes);
};

export default React.memo(ViewportCulling);
