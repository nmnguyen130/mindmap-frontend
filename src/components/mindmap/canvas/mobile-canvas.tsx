import { Canvas, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";

import { MindMapNode } from "@/stores/mindmaps";

import Node from "./node";
import Connection from "./connection";

interface MobileCanvasProps {
  nodes: MindMapNode[];
}

const MobileCanvas = ({ nodes }: MobileCanvasProps) => {
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

  // Render connections
  const renderConnections = React.useMemo(() => {
    if (!nodes.length) return null;

    // Create node lookup map for O(1) access
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Pre-allocate array with estimated capacity
    const allConnections: Array<{fromNode: MindMapNode, toNode: MindMapNode, key: string}> = [];

    for (const node of nodes) {
      for (const targetId of node.connections) {
        const targetNode = nodeMap.get(targetId);
        if (targetNode) {
          allConnections.push({
            fromNode: node,
            toNode: targetNode,
            key: `${node.id}-${targetId}`
          });
        }
      }
    }

    return allConnections.map(({fromNode, toNode, key}) => (
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
    return nodes.map((node) => (
      <Node
        key={node.id}
        node={node}
        nodeFillPaint={nodeFillPaint}
        nodeStrokePaint={nodeStrokePaint}
        textPaint={textPaint}
      />
    ));
  }, [nodes, nodeFillPaint, nodeStrokePaint, textPaint]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        {/* Draw connections */}
        {renderConnections}
        {/* Draw nodes */}
        {renderNodes}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  canvas: {
    flex: 1,
  },
});

export default MobileCanvas;