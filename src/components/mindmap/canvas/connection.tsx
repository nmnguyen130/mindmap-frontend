import { Path, Skia, SkPaint } from "@shopify/react-native-skia";
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
  connectionPaint: SkPaint;
}

const Connection = ({ fromNode, toNode, connectionPaint }: ConnectionProps) => {
  const path = React.useMemo(() => {
    const newPath = Skia.Path.Make();
    newPath.moveTo(fromNode.position.x, fromNode.position.y);

    // Create curved path for better visual appeal
    const midX = (fromNode.position.x + toNode.position.x) / 2;
    const midY = (fromNode.position.y + toNode.position.y) / 2;
    newPath.quadTo(midX, midY - 50, toNode.position.x, toNode.position.y);

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
