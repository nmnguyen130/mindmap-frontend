import {
  Circle,
  matchFont,
  RoundedRect,
  Text as SkiaText,
  SkPaint,
} from "@shopify/react-native-skia";
import React from "react";

interface NodeProps {
  node: {
    id: string;
    text: string;
    position: { x: number; y: number };
    connections: string[];
  };
  nodeFillPaint: SkPaint;
  nodeStrokePaint: SkPaint;
  textPaint: SkPaint;
}

export const NODE_RADIUS = 60;
export const NODE_PADDING = 16;

export default function Node({
  node,
  nodeFillPaint,
  nodeStrokePaint,
  textPaint,
}: NodeProps) {
  const font = matchFont({ fontSize: 14 });

  return (
    <React.Fragment key={node.id}>
      {/* Node shadow */}
      <Circle
        cx={node.position.x + 2}
        cy={node.position.y + 2}
        r={NODE_RADIUS}
        color="#000000"
        opacity={0.1}
      />

      {/* Main node circle */}
      <Circle
        cx={node.position.x}
        cy={node.position.y}
        r={NODE_RADIUS}
        paint={nodeFillPaint}
      />

      {/* Node border */}
      <Circle
        cx={node.position.x}
        cy={node.position.y}
        r={NODE_RADIUS}
        paint={nodeStrokePaint}
        style="stroke"
      />

      {/* Node text background for better readability */}
      <RoundedRect
        x={node.position.x - NODE_RADIUS + NODE_PADDING}
        y={node.position.y - 10}
        width={NODE_RADIUS * 2 - NODE_PADDING * 2}
        height={20}
        r={8}
        color="#ffffff"
        opacity={0.9}
      />

      {/* Node text */}
      <SkiaText
        x={node.position.x}
        y={node.position.y + 5}
        text={node.text}
        font={font}
        paint={textPaint}
      />
    </React.Fragment>
  );
}
