import { Canvas, Group, Skia } from "@shopify/react-native-skia";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

import { MindMapNode } from "@/stores/mindmaps";
import { getNodeBox } from "@/utils/node-utils";

import GestureHandler from "./gesture-handler";
import CanvasActionButtons from "./canvas-action-buttons";
import Connection from "./connection";
import Node from "./node";
import NodeSelectionPanel from "./node-selection-panel";

interface MobileCanvasProps {
  nodes: MindMapNode[];
}

const MobileCanvas = ({ nodes }: MobileCanvasProps) => {
  // Simple state for selected node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId) || null
    : null;

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

  const selectedNodeStrokePaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ef4444")); // Red for selection
    paint.setStyle(1); // Stroke style
    paint.setStrokeWidth(3);
    return paint;
  }, []);

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

  // Deselect node
  const deselectNode = useCallback(() => {
    if (selectedNodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // Handle node tap
  const handleNodeTap = useCallback(
    (worldX: number, worldY: number) => {
      const touchedNode = findNodeAtPoint({ x: worldX, y: worldY });
      const newSelectedNodeId = touchedNode?.id || null;

      if (newSelectedNodeId !== selectedNodeId) {
        setSelectedNodeId(newSelectedNodeId);
      }
    },
    [findNodeAtPoint, selectedNodeId]
  );

  // Render connections
  const renderConnections = React.useMemo(() => {
    if (!nodes.length) return null;

    // Create node lookup map for O(1) access
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    // Pre-allocate array with estimated capacity
    const allConnections: {
      fromNode: MindMapNode;
      toNode: MindMapNode;
      key: string;
    }[] = [];

    for (const node of nodes) {
      for (const targetId of node.connections) {
        const targetNode = nodeMap.get(targetId);
        if (targetNode) {
          allConnections.push({
            fromNode: node,
            toNode: targetNode,
            key: `${node.id}-${targetId}`,
          });
        }
      }
    }

    return allConnections.map(({ fromNode, toNode, key }) => (
      <Connection
        key={key}
        fromNode={fromNode}
        toNode={toNode}
        connectionPaint={connectionPaint}
      />
    ));
  }, [nodes, connectionPaint]);

  // Render nodes
  const renderNodes = React.useMemo(() => {
    return nodes.map((node) => {
      const isSelected = selectedNodeId === node.id;
      const strokePaint = isSelected
        ? selectedNodeStrokePaint
        : nodeStrokePaint;

      return (
        <Node
          key={node.id}
          node={node}
          nodeFillPaint={nodeFillPaint}
          nodeStrokePaint={strokePaint}
          textPaint={textPaint}
        />
      );
    });
  }, [
    nodes,
    selectedNodeId,
    nodeFillPaint,
    nodeStrokePaint,
    selectedNodeStrokePaint,
    textPaint,
  ]);

  return (
    <View className="flex-1 bg-gray-50">
      <GestureHandler onSingleTap={handleNodeTap}>
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
          )
        }}
      </GestureHandler>
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
