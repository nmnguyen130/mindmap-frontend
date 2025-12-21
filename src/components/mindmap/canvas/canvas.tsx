import type { MindMapNode, MindmapData } from "@/features/mindmap";

import MobileCanvas from "./mobile-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId: string;
  documentId?: string;
}

const Canvas = ({ nodes, edges, mindmapId, documentId }: CanvasProps) => {
  return (
    <MobileCanvas
      nodes={nodes}
      edges={edges}
      mindmapId={mindmapId}
      documentId={documentId}
    />
  );
};

export default Canvas;
