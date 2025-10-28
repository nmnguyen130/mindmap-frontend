import { Canvas, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

import { MindMapNode, useMindMapStore } from "@/stores/mindmaps";

import Connection from "./connection";
import Node, { NODE_RADIUS } from "./node";

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
  const { addNode, addConnection } = useMindMapStore();

  // Worklet function to handle touch events
  const handleTouch = (x: number, y: number) => {
    "use worklet";
    // Schedule the store operation on JS thread to avoid worklet issues
    scheduleOnRN(() => {
      // Check if tapping on a node (need to access nodes from JS thread)
      const tappedNode = nodes.find((node) => {
        const dx = x - node.position.x;
        const dy = y - node.position.y;
        return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS;
      });

      if (tappedNode) {
        console.log("Node tapped:", tappedNode.id);
        // TODO: Handle node selection/editing
      } else {
        // Add new node using SQLite store
        addNode(mindMapId, {
          text: "New Node",
          position: { x, y },
          connections: [],
        });
      }
    });
  };

  // Worklet function to handle double-tap for editing
  const handleDoubleTap = (x: number, y: number) => {
    "use worklet";
    scheduleOnRN(() => {
      const tappedNode = nodes.find((node) => {
        const dx = x - node.position.x;
        const dy = y - node.position.y;
        return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS;
      });

      if (tappedNode) {
        console.log("Node double-tapped for editing:", tappedNode.id);
        // TODO: Implement node editing
      }
    });
  };

  // Create separate tap gestures for single and double tap
  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart((event) => {
      handleTouch(event.x, event.y);
    });

  const doubleTap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(2)
    .onStart((event) => {
      handleDoubleTap(event.x, event.y);
    });

  // Combine gestures with exclusive handling
  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);

  // Create shared paint objects for better performance
  const nodeFillPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#3b82f6"));
    return paint;
  }, []);

  const nodeStrokePaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#1d4ed8"));
    paint.setStrokeWidth(3);
    return paint;
  }, []);

  const connectionPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#60a5fa"));
    paint.setStrokeWidth(2);
    return paint;
  }, []);

  const textPaint = React.useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ffffff"));
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
      <GestureDetector gesture={tapGesture}>
        <Canvas style={styles.canvas}>
          {/* Draw connections */}
          {renderConnections()}

          {/* Draw nodes */}
          {renderNodes()}
        </Canvas>
      </GestureDetector>

      {/* Instructions overlay */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          SQLite-Powered • Tap to add node • Data persists offline
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
