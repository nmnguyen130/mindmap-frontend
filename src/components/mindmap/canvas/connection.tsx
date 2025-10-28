import { Path, Skia } from "@shopify/react-native-skia";
import React from "react";

interface ConnectionProps {
  fromNode: {
    id: string;
    text: string;
    position: { x: number; y: number };
    connections: string[];
  };
  toNode: {
    id: string;
    text: string;
    position: { x: number; y: number };
    connections: string[];
  };
  connectionPaint: any;
}

export default function Connection({
  fromNode,
  toNode,
  connectionPaint,
}: ConnectionProps) {
  const path = Skia.Path.Make();
  path.moveTo(fromNode.position.x, fromNode.position.y);

  // Create curved path for better visual appeal
  const midX = (fromNode.position.x + toNode.position.x) / 2;
  const midY = (fromNode.position.y + toNode.position.y) / 2;
  path.quadTo(midX, midY - 50, toNode.position.x, toNode.position.y);

  return (
    <Path
      key={`${fromNode.id}-${toNode.id}`}
      path={path}
      paint={connectionPaint}
      style="stroke"
    />
  );
}
