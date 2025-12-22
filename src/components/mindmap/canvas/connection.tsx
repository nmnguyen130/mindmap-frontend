import { Group, Path, Skia } from "@shopify/react-native-skia";
import React from "react";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

// Connection Configuration

const CONNECTION_CONFIG = {
  strokeWidth: 2,
  highlightedStrokeWidth: 3,
  minControlOffset: 30,
  maxControlOffset: 120,
  controlOffsetRatio: 0.35,
} as const;

// Types

interface ConnectionColors {
  stroke: string;
}

interface SharedPosition {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface ConnectionProps {
  fromPosition: SharedPosition;
  toPosition: SharedPosition;
  colors?: ConnectionColors;
  isHighlighted?: boolean;
}

/** Default colors for backward compatibility */
const DEFAULT_COLORS: ConnectionColors = {
  stroke: "#60a5fa",
};

/**
 * Calculates the optimal control point offset for bezier curves
 * based on the distance and angle between nodes.
 */
const calculateControlOffset = (dx: number, dy: number): number => {
  "worklet";
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Scale offset with distance, clamped to min/max
  const offset = distance * CONNECTION_CONFIG.controlOffsetRatio;
  return Math.max(
    CONNECTION_CONFIG.minControlOffset,
    Math.min(CONNECTION_CONFIG.maxControlOffset, offset)
  );
};

// Connection Component

const Connection = ({
  fromPosition,
  toPosition,
  colors = DEFAULT_COLORS,
  isHighlighted = false,
}: ConnectionProps) => {
  const path = useDerivedValue(() => {
    const fromX = fromPosition.x.value;
    const fromY = fromPosition.y.value;
    const toX = toPosition.x.value;
    const toY = toPosition.y.value;

    const dx = toX - fromX;
    const dy = toY - fromY;

    const controlOffset = calculateControlOffset(dx, dy);

    // Determine curve orientation based on relative position
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    const path = Skia.Path.Make();
    path.moveTo(fromX, fromY);

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
  });

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
