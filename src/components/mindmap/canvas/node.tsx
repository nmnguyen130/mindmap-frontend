import {
  matchFont,
  RoundedRect,
  SkPaint,
  Text,
} from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";

import { MindMapNode } from "@/stores/mindmap";

interface NodeProps {
  node: MindMapNode;
  nodeFillPaint: SkPaint;
  nodeStrokePaint: SkPaint;
  textPaint: SkPaint;
}

const MIN_WIDTH = 80;
const MIN_HEIGHT = 32;
const PADDING = 12;
const FONT_SIZE = 12;

const font = matchFont({
  fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
  fontSize: FONT_SIZE,
});

const Node = ({
  node,
  nodeFillPaint,
  nodeStrokePaint,
  textPaint,
}: NodeProps) => {
  // Calculate text dimensions and node size
  const nodeDimensions = React.useMemo(() => {
    if (!node.label) {
      return {
        width: MIN_WIDTH,
        height: MIN_HEIGHT,
        textWidth: 0,
        textHeight: FONT_SIZE,
      };
    }

    const textMetrics = font.measureText(node.label);
    const textWidth = textMetrics.width;
    const textHeight = FONT_SIZE; // Approximate line height

    const nodeWidth = Math.max(MIN_WIDTH, textWidth + PADDING * 2);
    const nodeHeight = Math.max(MIN_HEIGHT, textHeight + PADDING * 2);

    return {
      width: nodeWidth,
      height: nodeHeight,
      textWidth,
      textHeight,
    };
  }, [node.label]);

  const {
    width: nodeWidth,
    height: nodeHeight,
    textWidth,
    textHeight,
  } = nodeDimensions;

  const position = node.position || { x: 0, y: 0 };

  return (
    <React.Fragment>
      {/* Node shadow */}
      <RoundedRect
        x={position.x - nodeWidth / 2 + 2}
        y={position.y - nodeHeight / 2 + 2}
        width={nodeWidth}
        height={nodeHeight}
        r={nodeHeight / 2}
        color="#000000"
        opacity={0.1}
      />

      {/* Main node */}
      <RoundedRect
        x={position.x - nodeWidth / 2}
        y={position.y - nodeHeight / 2}
        width={nodeWidth}
        height={nodeHeight}
        r={nodeHeight / 2}
        paint={nodeFillPaint}
      />

      {/* Node border */}
      <RoundedRect
        x={position.x - nodeWidth / 2}
        y={position.y - nodeHeight / 2}
        width={nodeWidth}
        height={nodeHeight}
        r={nodeHeight / 2}
        paint={nodeStrokePaint}
        style="stroke"
      />

      {/* Node text */}
      <Text
        x={position.x - textWidth / 2}
        y={position.y + textHeight / 2 - 2} // Adjust for baseline
        text={node.label}
        font={font}
        paint={textPaint}
      />
    </React.Fragment>
  );
};

export default React.memo(Node);
