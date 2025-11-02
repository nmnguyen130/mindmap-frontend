import React from "react";
import { Platform, Text, View } from "react-native";

import { MindMapNode } from "@/stores/mindmaps";

// Lazy load platform-specific canvases for better performance
const WebCanvas = React.lazy(() => import("./web-canvas"));
const MobileCanvas = React.lazy(() => import("./mobile-canvas"));

interface CanvasProps {
  mindMapId: string;
  nodes: MindMapNode[];
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onNodeDelete: (id: string) => void;
  onConnectionAdd: (from: string, to: string) => void;
  onConnectionDelete: (connectionId: string) => void;
}

export default function Canvas(props: CanvasProps) {
  const isWeb = Platform.OS === "web";
  const CanvasComponent = isWeb ? WebCanvas : MobileCanvas;

  return (
    <React.Suspense fallback={<CanvasFallback />}>
      <CanvasComponent {...props} />
    </React.Suspense>
  );
}

function CanvasFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <View className="items-center">
        <View className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></View>
        <Text className="text-gray-600 dark:text-gray-400 text-center">
          Loading canvas...
        </Text>
      </View>
    </View>
  );
}
