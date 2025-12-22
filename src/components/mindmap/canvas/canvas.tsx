import type { MindMapNode, MindmapData } from "@/features/mindmap";

import MobileCanvas from "./mobile-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId: string;
  documentId?: string;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
  onAddNode?: () => void;
  onAddConnection?: (fromId: string, toId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteConnection?: (connectionId: string) => void;
}

const Canvas = ({
  nodes,
  edges,
  mindmapId,
  documentId,
  onNodeMove,
  onAddNode,
  onAddConnection,
  onDeleteNode,
  onDeleteConnection,
}: CanvasProps) => {
  return (
    <MobileCanvas
      nodes={nodes}
      edges={edges}
      mindmapId={mindmapId}
      documentId={documentId}
      onNodeMove={onNodeMove}
      onAddNode={onAddNode}
      onAddConnection={onAddConnection}
      onDeleteNode={onDeleteNode}
      onDeleteConnection={onDeleteConnection}
    />
  );
};

export default Canvas;
