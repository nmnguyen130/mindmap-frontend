import { Canvas, Group, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { type SharedValue } from "react-native-reanimated";

import { MindMapNode } from "@/stores/mindmaps";

import { CanvasGestureHandler } from "./gesture-handler";
import Connection from "./connection";
import Node from "./node";

interface MobileCanvasProps {
  mindMapId: string;
  nodes: MindMapNode[];
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onNodeDelete: (id: string) => void;
  onConnectionDelete: (connectionId: string) => void;
}

export default function MobileCanvas({
  mindMapId,
  nodes,
  onNodeUpdate,
  onConnectionDelete,
}: MobileCanvasProps) {
  // Create shared paint objects for better performance
  const nodeFillPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#dbeafe"));
    return paint;
  }, []);

  const nodeStrokePaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#60a5fa"));
    paint.setStrokeWidth(2);
    return paint;
  }, []);

  const connectionPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#93c5fd"));
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
  const renderConnections = () => {
    return nodes.map((node) =>
      node.connections.map((targetId) => {
        const targetNode = nodes.find((n) => n.id === targetId);
        if (!targetNode) return null;

        return (
          <Connection
            key={`${node.id}-${targetId}`}
            fromNode={node}
            toNode={targetNode}
            connectionPaint={connectionPaint}
          />
        );
      })
    );
  };

  // Render nodes
  const renderNodes = () => {
    return nodes.map((node) => (
      <Node
        key={node.id}
        node={node}
        nodeFillPaint={nodeFillPaint}
        nodeStrokePaint={nodeStrokePaint}
        textPaint={textPaint}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <CanvasGestureHandler>
        {(matrix) => (
          <Canvas style={styles.canvas}>
            <Group matrix={matrix}>
              {/* Draw connections */}
              {renderConnections()}

              {/* Draw nodes */}
              {renderNodes()}
            </Group>
          </Canvas>
        )}
      </CanvasGestureHandler>

      {/* Instructions overlay */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          SQLite-Powered • Pinch to zoom • Pan to move • Tap to add node • Data persists offline
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
});
