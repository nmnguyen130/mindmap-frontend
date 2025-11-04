import React from "react";
import { useDerivedValue, useAnimatedReaction, runOnJS, type SharedValue } from "react-native-reanimated";
import type { Matrix4 } from "@shopify/react-native-skia";

import { MindMapNode } from "@/stores/mindmaps";

interface ViewportCullingProps {
  matrix: SharedValue<Matrix4>;
  nodes: MindMapNode[];
  viewportWidth: number;
  viewportHeight: number;
  viewportOffsetX?: number;
  viewportOffsetY?: number;
  children: (visibleNodes: MindMapNode[]) => React.ReactNode;
}

export function ViewportCulling({
  matrix,
  nodes,
  viewportWidth,
  viewportHeight,
  viewportOffsetX = 0,
  viewportOffsetY = 0,
  children,
}: ViewportCullingProps) {
  // React state for visible nodes
  const [visibleNodesState, setVisibleNodesState] = React.useState<MindMapNode[]>(nodes);

  // Calculate visible nodes using useDerivedValue for proper reactivity
  const visibleNodes = useDerivedValue(() => {
    "worklet";

    if (!matrix.value) return nodes;

    // Extract scale and translation from Matrix4 using array indices
    const scale = matrix.value[0] || 1;
    const translateX = matrix.value[3] || 0;
    const translateY = matrix.value[7] || 0;

    // Calculate world viewport bounds based on camera position (inverse transform)
    // Account for viewport offset from screen center
    const worldViewportLeft = (viewportOffsetX - translateX) / scale;
    const worldViewportRight = ((viewportOffsetX + viewportWidth) - translateX) / scale;
    const worldViewportTop = (viewportOffsetY - translateY) / scale;
    const worldViewportBottom = ((viewportOffsetY + viewportHeight) - translateY) / scale;

    // Margin for smooth scrolling (in world coordinates)
    const margin = 50 / scale;

    // Pre-calculate world bounds with margin for efficiency
    const worldLeftWithMargin = worldViewportLeft - margin;
    const worldRightWithMargin = worldViewportRight + margin;
    const worldTopWithMargin = worldViewportTop - margin;
    const worldBottomWithMargin = worldViewportBottom + margin;

    // Filter nodes that intersect with world viewport
    const filteredNodes = nodes.filter((node) => {
      const { x, y } = node.position;

      // Use tighter bounds for nodes (approximate based on text length)
      const nodeWidth = Math.max(80, (node.text?.length || 0) * 8 + 24);
      const nodeHeight = 32;

      const nodeLeft = x - nodeWidth / 2;
      const nodeRight = x + nodeWidth / 2;
      const nodeTop = y - nodeHeight / 2;
      const nodeBottom = y + nodeHeight / 2;

      // Efficient AABB intersection test in world coordinates
      return (
        nodeRight >= worldLeftWithMargin &&
        nodeLeft <= worldRightWithMargin &&
        nodeBottom >= worldTopWithMargin &&
        nodeTop <= worldBottomWithMargin
      );
    });

    return filteredNodes;
  });

  // Safely update React state when visibleNodes changes
  useAnimatedReaction(
    () => visibleNodes.value,
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        runOnJS(setVisibleNodesState)(currentValue);
      }
    }
  );

  return <>{children(visibleNodesState)}</>;
}
