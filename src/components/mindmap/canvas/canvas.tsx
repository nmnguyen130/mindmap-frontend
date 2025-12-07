import { Platform } from "react-native";

import type { MindMapNode, MindmapData } from "@/features/mindmap";

import MobileCanvas from "./mobile-canvas";
import WebCanvas from "./web-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId?: string | null;
}

const Canvas = ({ nodes, edges, mindmapId }: CanvasProps) => {
  const CanvasComponent = Platform.OS === "web" ? WebCanvas : MobileCanvas;
  return <CanvasComponent nodes={nodes} edges={edges} mindmapId={mindmapId} />;
};

export default Canvas;
