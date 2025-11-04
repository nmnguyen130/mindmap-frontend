import { Canvas, Group, Rect, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { MindMapNode } from "@/stores/mindmaps";

import { CanvasGestureHandler } from "./gesture-handler";
import { ViewportCulling } from "./viewport-culling";
import Connection from "./connection";
import Node from "./node";

// Flag to enable/disable viewport culling for testing
// Set to true for performance optimization (only render visible nodes)
// Set to false to render all nodes (useful for debugging or small datasets)
const USE_VIEWPORT_CULLING = false;

interface MobileCanvasProps {
  mindMapId: string;
  nodes: MindMapNode[];
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onNodeDelete: (id: string) => void;
  onConnectionAdd: (from: string, to: string) => void;
  onConnectionDelete: (connectionId: string) => void;
}

export default function MobileCanvas({
  mindMapId,
  nodes,
  onNodeUpdate,
  onConnectionAdd,
  onConnectionDelete,
}: MobileCanvasProps) {
  const nodeFillPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#dbeafe"));
    return paint;
  }, []);

  const nodeStrokePaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#60a5fa"));
    paint.setStyle(1); // Stroke style
    paint.setStrokeWidth(2);
    return paint;
  }, []);

  const connectionPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#93c5fd"));
    paint.setStyle(1); // Stroke style
    paint.setStrokeWidth(2);
    return paint;
  }, []);

  const textPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#1e40af"));
    paint.setStyle(0); // Fill style
    paint.setAntiAlias(true);
    return paint;
  }, []);

  const marginStrokePaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("rgba(0, 255, 0, 0.8)"));
    paint.setStyle(1); // Stroke style
    paint.setStrokeWidth(2);
    return paint;
  }, []);
  const canvasRef = React.useRef<View>(null);
  const [canvasBounds, setCanvasBounds] = React.useState({ x: 0, y: 0, width: 400, height: 300 });

  // Update canvas bounds when layout changes
  const onCanvasLayout = React.useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.measure((x, y, width, height, pageX, pageY) => {
        setCanvasBounds({ x: pageX, y: pageY, width, height });
      });
    }
  }, []);

  // Calculate viewport based on actual canvas bounds
  const testViewportWidth = Math.min(400, canvasBounds.width * 0.8);
  const testViewportHeight = Math.min(300, canvasBounds.height * 0.6);

  // Center viewport within canvas bounds
  const viewportOffsetX = canvasBounds.x + (canvasBounds.width - testViewportWidth) / 2;
  const viewportOffsetY = canvasBounds.y + (canvasBounds.height - testViewportHeight) / 2;

  // Memoized render functions to prevent unnecessary re-renders
  const renderConnections = React.useCallback((visibleNodesList: MindMapNode[]) => {
    if (visibleNodesList.length === 0) return null;

    const visibleNodeIds = new Set(visibleNodesList.map(node => node.id));

    return nodes.map((node) => {
      // Skip if source node is not visible
      if (!visibleNodeIds.has(node.id)) return null;

      return node.connections.map((targetId) => {
        const targetNode = nodes.find((n) => n.id === targetId);
        if (!targetNode || !visibleNodeIds.has(targetNode.id)) return null;

        return (
          <Connection
            key={`${node.id}-${targetId}`}
            fromNode={node}
            toNode={targetNode}
            connectionPaint={connectionPaint}
          />
        );
      });
    });
  }, [nodes, connectionPaint]);

  const renderNodes = React.useCallback((visibleNodesList: MindMapNode[]) => {
    if (visibleNodesList.length === 0) return null;

    return visibleNodesList.map((node) => (
      <Node
        key={node.id}
        node={node}
        nodeFillPaint={nodeFillPaint}
        nodeStrokePaint={nodeStrokePaint}
        textPaint={textPaint}
      />
    ));
  }, [nodeFillPaint, nodeStrokePaint, textPaint]);

  return (
    <View style={styles.container}>
      <CanvasGestureHandler>
        {(matrix, focalPoint) => {

          const focalStyle = useAnimatedStyle(() => ({
            transform: [
              { translateX: focalPoint.value.x - 6 },
              { translateY: focalPoint.value.y - 6 },
            ],
          }));

          return (
            <View ref={canvasRef} onLayout={onCanvasLayout} style={styles.canvasContainer}>
              <Canvas style={styles.canvas}>
                <Group matrix={matrix}>
                  {/* Viewport Culling - conditionally render visible nodes only */}
                  {USE_VIEWPORT_CULLING ? (
                    <ViewportCulling
                      matrix={matrix}
                      nodes={nodes}
                      viewportWidth={testViewportWidth}
                      viewportHeight={testViewportHeight}
                      viewportOffsetX={(canvasBounds.width - testViewportWidth) / 2}
                      viewportOffsetY={(canvasBounds.height - testViewportHeight) / 2}
                    >
                      {(visibleNodesList) => (
                        <>
                          {/* Draw connections (only visible ones) */}
                          {renderConnections(visibleNodesList)}
                          {/* Draw nodes (only visible ones) */}
                          {renderNodes(visibleNodesList)}
                        </>
                      )}
                    </ViewportCulling>
                  ) : (
                    <>
                      {/* Draw all connections and nodes without culling */}
                      {renderConnections(nodes)}
                      {renderNodes(nodes)}
                    </>
                  )}
                </Group>

                {/* Viewport overlays - only show when culling is enabled */}
                {USE_VIEWPORT_CULLING && (
                  <>
                    {/* World viewport indicator (centered within canvas) */}
                    <Rect
                      x={(canvasBounds.width - testViewportWidth) / 2}
                      y={(canvasBounds.height - testViewportHeight) / 2}
                      width={testViewportWidth}
                      height={testViewportHeight}
                      color="rgba(255, 0, 0, 0.2)"
                    />

                    {/* World viewport with margin (larger area) */}
                    <Rect
                      x={Math.max(0, (canvasBounds.width - testViewportWidth) / 2 - 50)}
                      y={Math.max(0, (canvasBounds.height - testViewportHeight) / 2 - 50)}
                      width={Math.min(canvasBounds.width, testViewportWidth + 100)}
                      height={Math.min(canvasBounds.height, testViewportHeight + 100)}
                      paint={marginStrokePaint}
                    />
                  </>
                )}
              </Canvas>
              {USE_VIEWPORT_CULLING && (
                <Animated.View pointerEvents="none" style={[styles.focalDot, focalStyle]} />
              )}
            </View>
          );
        }}
      </CanvasGestureHandler>

      {/* Instructions overlay */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {USE_VIEWPORT_CULLING
            ? "Red = strict viewport • Green = margin area • Pan/zoom to see culling"
            : "Viewport Culling Disabled • All nodes rendered • Toggle USE_VIEWPORT_CULLING to enable"
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  instructions: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  focalDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 0, 0.9)",
    borderWidth: 1,
    borderColor: "#444",
  },
});
