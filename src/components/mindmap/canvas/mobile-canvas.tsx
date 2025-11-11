import { Canvas, Group, Skia } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { useFPSDetection } from "@/hooks/use-fps-detection";
import { MindMapNode } from "@/stores/mindmaps";
import { getNodeBox } from "@/utils/node-utils";

import CanvasActionButtons from "../ui/canvas-action-buttons";
import FPSOverlay from "../ui/fps-overlay";
import NodeSelectionPanel from "../ui/node-selection-panel";

import Connection from "./connection";
import GestureHandler from "./gesture-handler";
import Node from "./node";
import ViewportCulling, { ViewportVisualization } from "./viewport-culling";

interface MobileCanvasProps {
  nodes: MindMapNode[];
}

const MobileCanvas = ({ nodes }: MobileCanvasProps) => {
  // FPS monitoring
  const { isInteracting, fpsMetrics, startInteraction, stopInteraction } =
    useFPSDetection();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId) || null
    : null;

  const paints = useMemo(() => {
    const createPaint = (color: string, style = 0, strokeWidth = 1) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(color));
      paint.setStyle(style); // 0 = fill, 1 = stroke
      paint.setStrokeWidth(strokeWidth);
      paint.setAntiAlias(true);
      return paint;
    };

    return {
      nodeFill: createPaint("#dbeafe"),
      nodeStroke: createPaint("#60a5fa", 1, 2),
      selectedNodeStroke: createPaint("#ef4444", 1, 3),
      connection: createPaint("#93c5fd", 1, 2),
      text: createPaint("#1e40af"),
    };
  }, []);

  // Quick node lookup map
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Find node at touch position
  const findNodeAtPoint = useCallback(
    (point: { x: number; y: number }): MindMapNode | null => {
      for (const node of nodes) {
        const box = getNodeBox(node);
        if (
          point.x >= box.left &&
          point.x <= box.right &&
          point.y >= box.top &&
          point.y <= box.bottom
        ) {
          return node;
        }
      }
      return null;
    },
    [nodes]
  );

  // Handle node tap
  const handleNodeTap = useCallback(
    (worldX: number, worldY: number) => {
      const node = findNodeAtPoint({ x: worldX, y: worldY });
      const newSelected = node?.id ?? null;
      if (newSelected !== selectedNodeId) {
        setSelectedNodeId(newSelected);
      }
    },
    [findNodeAtPoint, selectedNodeId]
  );

  // Clear selection
  const deselectNode = useCallback(() => {
    if (selectedNodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // Render connections - show all links where at least one node is visible
  const renderConnections = React.useCallback(
    (visibleNodes: MindMapNode[]) => {
      if (visibleNodes.length === 0) return null;

      const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
      const connectionComponents: React.ReactNode[] = [];

      for (const sourceNode of nodes) {
        for (const targetId of sourceNode.connections) {
          const targetNode = nodeMap.get(targetId);
          if (!targetNode) continue;

          // Draw connection if either end is on screen
          if (
            visibleNodeIds.has(sourceNode.id) ||
            visibleNodeIds.has(targetNode.id)
          ) {
            connectionComponents.push(
              <Connection
                key={`${sourceNode.id}-${targetId}`}
                fromNode={sourceNode}
                toNode={targetNode}
                connectionPaint={paints.connection}
              />
            );
          }
        }
      }

      return connectionComponents;
    },
    [nodes, nodeMap, paints.connection]
  );

  // Render visible nodes
  const renderNodes = React.useCallback(
    (visibleNodes: MindMapNode[]) => {
      if (visibleNodes.length === 0) return null;

      return visibleNodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        return (
          <Node
            key={node.id}
            node={node}
            nodeFillPaint={paints.nodeFill}
            nodeStrokePaint={
              isSelected ? paints.selectedNodeStroke : paints.nodeStroke
            }
            textPaint={paints.text}
          />
        );
      });
    },
    [selectedNodeId, paints]
  );

  return (
    <View
      className="flex-1 bg-gray-50"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setCanvasSize({ width, height });
      }}
    >
      <GestureHandler
        onSingleTap={handleNodeTap}
        onInteractionStart={startInteraction}
        onInteractionEnd={stopInteraction}
      >
        {(matrix, focalPoint) => {
          return (
            <Canvas style={{ flex: 1 }}>
              {/* Viewport overlay */}
              <ViewportVisualization screenSize={canvasSize} />

              {/* World content with gesture transforms */}
              <Group matrix={matrix}>
                <ViewportCulling
                  matrix={matrix}
                  nodes={nodes}
                  screenSize={canvasSize}
                >
                  {(visibleNodes) => (
                    <>
                      {/* Draw connections */}
                      {renderConnections(visibleNodes)}
                      {/* Draw nodes */}
                      {renderNodes(visibleNodes)}
                    </>
                  )}
                </ViewportCulling>
              </Group>
            </Canvas>
          );
        }}
      </GestureHandler>

      {/* FPS Overlay */}
      <FPSOverlay isVisible={isInteracting} metrics={fpsMetrics} />

      {/* Node Details Panel */}
      <NodeSelectionPanel selectedNode={selectedNode} />

      {/* Action Buttons */}
      <CanvasActionButtons
        selectedNode={selectedNode}
        onDeselect={deselectNode}
      />
    </View>
  );
};

export default MobileCanvas;
