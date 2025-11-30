import { Canvas, Group, Skia } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";
import { useFPSDetection } from "@/shared/hooks/use-fps-detection";
import { MindMapNode, MindmapData, useMindMapStore } from "@/features/mindmap/store/mindmap-store";
import { getNodeBox } from "@/utils/node-utils";

import FPSOverlay from "../ui/fps-overlay";
import NodeSelectionPanel from "../ui/node-selection-panel";

import Connection from "./connection";
import GestureHandler from "./gesture-handler";
import Node from "./node";
import ViewportCulling, { ViewportVisualization } from "./viewport-culling";

interface MobileCanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData['edges'];
}

const MobileCanvas = ({ nodes, edges }: MobileCanvasProps) => {
  const { colors, isDark } = useTheme();
  const { getCurrentMap } = useMindMapStore();

  // Get current mindmap ID
  const currentMap = getCurrentMap();
  const mindmapId = currentMap?.id || null;

  // FPS monitoring for development
  const { isInteracting, fpsMetrics, startInteraction, stopInteraction } =
    useFPSDetection();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
      nodeFill: createPaint(isDark ? "#1e293b" : "#dbeafe"),
      nodeStroke: createPaint(colors.connection, 1, 2),
      selectedNodeStroke: createPaint(colors.primary, 1, 3),
      connection: createPaint(colors.connection, 1, 2),
      text: createPaint(isDark ? "#f1f5f9" : "#1e40af"),
    };
  }, [colors, isDark]);

  // Quick node lookup map
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) ?? null;
  }, [selectedNodeId, nodeMap]);

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];

    const neighbors: MindMapNode[] = [];

    // Find neighbors through edges
    edges.forEach(edge => {
      if (edge.from === selectedNode.id) {
        const target = nodeMap.get(edge.to);
        if (target) neighbors.push(target);
      } else if (edge.to === selectedNode.id) {
        const source = nodeMap.get(edge.from);
        if (source) neighbors.push(source);
      }
    });

    // Deduplicate by id
    const seen = new Set<string>();
    return neighbors.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }, [selectedNode, nodeMap, edges]);

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

      edges.forEach((edge) => {
        const sourceNode = nodeMap.get(edge.from);
        const targetNode = nodeMap.get(edge.to);

        if (!sourceNode || !targetNode) return;

        // Draw connection if either end is on screen
        if (
          visibleNodeIds.has(sourceNode.id) ||
          visibleNodeIds.has(targetNode.id)
        ) {
          connectionComponents.push(
            <Connection
              key={`${edge.from}-${edge.to}`}
              fromNode={sourceNode}
              toNode={targetNode}
              connectionPaint={paints.connection}
            />
          );
        }
      });

      return connectionComponents;
    },
    [nodes, nodeMap, paints.connection, edges]
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
      className="flex-1"
      style={{ backgroundColor: colors.background }}
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
              {/* Viewport overlay for development */}
              {/* <ViewportVisualization screenSize={canvasSize} /> */}

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

      {/* FPS Overlay - for development */}
      <FPSOverlay isVisible={isInteracting} metrics={fpsMetrics} />

      {/* Node Details Panel */}
      <NodeSelectionPanel
        selectedNode={selectedNode}
        colors={colors}
        relatedNodes={relatedNodes}
        mindmapId={mindmapId}
        onClose={deselectNode}
      />
    </View>
  );
};

export default MobileCanvas;
