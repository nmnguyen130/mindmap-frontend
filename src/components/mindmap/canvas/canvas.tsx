import { Platform } from "react-native";

import { MindMapNode } from "@/stores/mindmap";

import MobileCanvas from "./mobile-canvas";
import WebCanvas from "./web-canvas";

interface CanvasProps {
  nodes: MindMapNode[];
}

const Canvas = ({ nodes }: CanvasProps) => {
  const CanvasComponent = Platform.OS === "web" ? WebCanvas : MobileCanvas;
  return <CanvasComponent nodes={nodes} />;
};

export default Canvas;
