import { Path, Skia, SkPaint } from "@shopify/react-native-skia";
import React from "react";

import { MindMapNode } from "@/stores/mindmap";

interface ConnectionProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
  connectionPaint: SkPaint;
}

const Connection = ({ fromNode, toNode, connectionPaint }: ConnectionProps) => {
  const path = React.useMemo(() => {
    const fromPos = fromNode.position || { x: 0, y: 0 };
    const toPos = toNode.position || { x: 0, y: 0 };

    const newPath = Skia.Path.Make();
    newPath.moveTo(fromPos.x, fromPos.y);

    // Create curved path for better visual appeal
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    newPath.quadTo(midX, midY - 50, toPos.x, toPos.y);

    return newPath;
  }, [fromNode.position, toNode.position]);

  return (
    <Path
      key={`${fromNode.id}-${toNode.id}`}
      path={path}
      paint={connectionPaint}
      style="stroke"
    />
  );
};

export default React.memo(Connection);
