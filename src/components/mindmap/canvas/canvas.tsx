import type { MindMapNode, MindmapData } from "@/features/mindmap";

import MobileCanvas from "./mobile-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId?: string | null;
}

const Canvas = ({ nodes, edges, mindmapId }: CanvasProps) => {
  return <MobileCanvas nodes={nodes} edges={edges} mindmapId={mindmapId} />;
};

export default Canvas;
