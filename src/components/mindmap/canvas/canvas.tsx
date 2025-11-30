import { Platform } from "react-native";

import { MindMapNode, MindmapData } from "@/features/mindmap/store/mindmap-store";

import MobileCanvas from "./mobile-canvas";
import WebCanvas from "./web-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData['edges'];
}

const Canvas = ({ nodes, edges }: CanvasProps) => {
  const CanvasComponent = Platform.OS === "web" ? WebCanvas : MobileCanvas;
  return <CanvasComponent nodes={nodes} edges={edges} />;
};

export default Canvas;
