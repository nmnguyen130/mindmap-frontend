import {
  Group,
  matchFont,
  RoundedRect,
  Text,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Platform } from "react-native";

import type { MindMapNode } from "@/features/mindmap";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

// Node Configuration

const NODE_CONFIG = {
  minWidth: 100,
  minHeight: 40,
  padding: { x: 16, y: 12 },
  cornerRadius: 12,
} as const;

const FONT_SIZES = {
  root: 14,
  branch: 12,
  leaf: 11,
} as const;

// Types

interface NodeColors {
  fill: string;
  stroke: string;
  text: string;
}

interface NodeProps {
  node: MindMapNode;
  position: { x: SharedValue<number>; y: SharedValue<number> };
  colors?: NodeColors;
  isSelected?: boolean;
}

const DEFAULT_COLORS: NodeColors = {
  fill: "#1e293b",
  stroke: "#475569",
  text: "#f1f5f9",
};

// Pre-create fonts (module level for max performance)
const fonts = {
  root: matchFont({
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
    fontSize: FONT_SIZES.root,
    fontWeight: "bold",
  }),
  branch: matchFont({
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
    fontSize: FONT_SIZES.branch,
  }),
  leaf: matchFont({
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
    fontSize: FONT_SIZES.leaf,
  }),
};

// Node Component (optimized - no shadows for performance)

const Node = ({
  node,
  position,
  colors = DEFAULT_COLORS,
  isSelected = false,
}: NodeProps) => {
  const level = node.level ?? 0;
  const font =
    level === 0 ? fonts.root : level <= 2 ? fonts.branch : fonts.leaf;
  const fontSize =
    level === 0
      ? FONT_SIZES.root
      : level <= 2
        ? FONT_SIZES.branch
        : FONT_SIZES.leaf;

  const dimensions = useMemo(() => {
    const label = node.label || "";
    const textMetrics = font.measureText(label);

    return {
      width: Math.max(
        NODE_CONFIG.minWidth,
        textMetrics.width + NODE_CONFIG.padding.x * 2
      ),
      height: Math.max(
        NODE_CONFIG.minHeight,
        fontSize + NODE_CONFIG.padding.y * 2
      ),
      textWidth: textMetrics.width,
    };
  }, [node.label, font, fontSize]);

  const { width, height, textWidth } = dimensions;

  const x = useDerivedValue(() => position.x.value - width / 2);
  const y = useDerivedValue(() => position.y.value - height / 2);
  const textX = useDerivedValue(() => position.x.value - textWidth / 2);
  const textY = useDerivedValue(() => position.y.value + fontSize / 3);

  return (
    <Group>
      {/* Node background */}
      <RoundedRect
        x={x}
        y={y}
        width={width}
        height={height}
        r={NODE_CONFIG.cornerRadius}
        color={colors.fill}
      />

      {/* Node border */}
      <RoundedRect
        x={x}
        y={y}
        width={width}
        height={height}
        r={NODE_CONFIG.cornerRadius}
        color={colors.stroke}
        style="stroke"
        strokeWidth={isSelected ? 3 : 1.5}
      />

      {/* Node label */}
      <Text
        x={textX}
        y={textY}
        text={node.label ?? ""}
        font={font}
        color={colors.text}
      />
    </Group>
  );
};

export default React.memo(Node);
