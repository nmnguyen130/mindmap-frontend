import { Group, Path, Skia } from "@shopify/react-native-skia";
import React, { useMemo } from "react";

import type { MindMapNode } from "@/features/mindmap";

// Connection Configuration

const CONNECTION_CONFIG = {
  /** Default stroke width for connections */
  strokeWidth: 2,

  /** Stroke width for highlighted/selected connections */
  highlightedStrokeWidth: 3,

  /** Minimum curve control offset */
  minControlOffset: 30,

  /** Maximum curve control offset (for very long connections) */
  maxControlOffset: 120,

  /** Control offset ratio (percentage of distance) */
  controlOffsetRatio: 0.35,
} as const;

// Types

interface ConnectionColors {
  stroke: string;
}

interface ConnectionProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
  colors?: ConnectionColors;
  isHighlighted?: boolean;
}

/** Default colors for backward compatibility */
const DEFAULT_COLORS: ConnectionColors = {
  stroke: "#60a5fa",
};

// Utility Functions

/**
 * Calculates the optimal control point offset for bezier curves
 * based on the distance and angle between nodes.
 */
const calculateControlOffset = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Scale offset with distance, clamped to min/max
  const offset = distance * CONNECTION_CONFIG.controlOffsetRatio;
  return Math.max(
    CONNECTION_CONFIG.minControlOffset,
    Math.min(CONNECTION_CONFIG.maxControlOffset, offset)
  );
};

/**
 * Creates a smooth cubic bezier path between two points.
 * The curve direction adapts based on relative node positions.
 */
const createBezierPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) => {
  const path = Skia.Path.Make();
  path.moveTo(fromX, fromY);

  const dx = toX - fromX;
  const dy = toY - fromY;
  const controlOffset = calculateControlOffset(fromX, fromY, toX, toY);

  // Determine curve orientation based on relative position
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

  if (isHorizontal) {
    // Horizontal layout: curve with horizontal control points
    cp1x = fromX + controlOffset * Math.sign(dx);
    cp1y = fromY;
    cp2x = toX - controlOffset * Math.sign(dx);
    cp2y = toY;
  } else {
    // Vertical layout: curve with vertical control points
    cp1x = fromX;
    cp1y = fromY + controlOffset * Math.sign(dy);
    cp2x = toX;
    cp2y = toY - controlOffset * Math.sign(dy);
  }

  path.cubicTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
  return path;
};

// Connection Component

const Connection = ({
  fromNode,
  toNode,
  colors = DEFAULT_COLORS,
  isHighlighted = false,
}: ConnectionProps) => {
  const path = useMemo(() => {
    const fromPos = fromNode.position ?? { x: 0, y: 0 };
    const toPos = toNode.position ?? { x: 0, y: 0 };

    return createBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
  }, [fromNode.position, toNode.position]);

  const strokeWidth = isHighlighted
    ? CONNECTION_CONFIG.highlightedStrokeWidth
    : CONNECTION_CONFIG.strokeWidth;

  return (
    <Group>
      <Path
        path={path}
        color={colors.stroke}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </Group>
  );
};

export default React.memo(Connection);
