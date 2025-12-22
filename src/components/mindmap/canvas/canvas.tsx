import type { MindMapNode, MindmapData } from "@/features/mindmap";

import MobileCanvas from "./mobile-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId: string;
  documentId?: string;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
}

const Canvas = ({
  nodes,
  edges,
  mindmapId,
  documentId,
  onNodeMove,
}: CanvasProps) => {
  return (
    <MobileCanvas
      nodes={nodes}
      edges={edges}
      mindmapId={mindmapId}
      documentId={documentId}
      onNodeMove={onNodeMove}
    />
  );
};

export default Canvas;
