import { Canvas, Group, Skia } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { MindMapNode } from "@/stores/mindmaps";
import { getNodeBox } from "@/utils/node-utils";
import { useFPSDetection } from "@/hooks/use-fps-detection";

import CanvasActionButtons from "../ui/canvas-action-buttons";
import NodeSelectionPanel from "../ui/node-selection-panel";
import FPSOverlay from "../ui/fps-overlay";

import Connection from "./connection";
import GestureHandler from "./gesture-handler";
import Node from "./node";

interface MobileCanvasProps {
  nodes: MindMapNode[];
}

const MobileCanvas = ({ nodes }: MobileCanvasProps) => {
  // FPS detection hook
  const { isInteracting, fpsMetrics, startInteraction, stopInteraction } = useFPSDetection();

  // Simple state for selected node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  // Fast lookup map for nodes
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Find node at touch point using bounding box
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

  // Deselect node
  const deselectNode = useCallback(() => {
    if (selectedNodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // Render connections
  const renderConnections = useMemo(() => {
    if (!nodes.length) return null;

    const conns: React.ReactNode[] = [];
    for (const node of nodes) {
      for (const targetId of node.connections) {
        const target = nodeMap.get(targetId);
        if (target) {
          conns.push(
            <Connection
              key={`${node.id}-${targetId}`}
              fromNode={node}
              toNode={target}
              connectionPaint={paints.connection}
            />
          );
        }
      }
    }
    return conns;
  }, [nodes, nodeMap, paints.connection]);

  // Render nodes
  const renderNodes = useMemo(
    () =>
      nodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        return (
          <Node
            key={node.id}
            node={node}
            nodeFillPaint={paints.nodeFill}
            nodeStrokePaint={isSelected ? paints.selectedNodeStroke : paints.nodeStroke}
            textPaint={paints.text}
          />
        );
      }),
    [nodes, selectedNodeId, paints]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <GestureHandler 
        onSingleTap={handleNodeTap}
        onInteractionStart={startInteraction}
        onInteractionEnd={stopInteraction}
      >
        {(matrix, focalPoint) => {
          return (
            <Canvas style={{ flex: 1 }}>
              <Group matrix={matrix}>
                {/* Draw connections */}
                {renderConnections}
                {/* Draw nodes */}
                {renderNodes}
              </Group>
            </Canvas>
          );
        }}
      </GestureHandler>
      
      {/* FPS Overlay */}
      <FPSOverlay isVisible={isInteracting} metrics={fpsMetrics} />
      
      {/* Selection Panel */}
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
