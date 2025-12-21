import { Canvas, Group } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { useTheme } from "@/components/providers/theme-provider";
import type { MindMapNode, MindmapData } from "@/features/mindmap";
import { getNodeBox } from "@/features/mindmap/utils/node-utils";

import NodeFloatBox from "../ui/node-float-box";
import NodeSelectionPanel from "../ui/node-selection-panel";

import Connection from "./connection";
import GestureHandler from "./gesture-handler";
import Node from "./node";
import ViewportCulling from "./viewport-culling";

// Types

interface MobileCanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData["edges"];
  mindmapId: string;
  documentId?: string;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
}

// Component

const MobileCanvas = ({
  nodes,
  edges,
  mindmapId,
  documentId,
  onNodeMove,
}: MobileCanvasProps) => {
  const { colors } = useTheme();

  // UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Drag state
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const isDraggingNode = useSharedValue(false);

  // Node map
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = selectedNodeId
    ? (nodeMap.get(selectedNodeId) ?? null)
    : null;

  // Related nodes
  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.from === selectedNode.id) ids.add(edge.to);
      else if (edge.to === selectedNode.id) ids.add(edge.from);
    }
    return Array.from(ids)
      .map((id) => nodeMap.get(id))
      .filter((n): n is MindMapNode => !!n);
  }, [selectedNode, nodeMap, edges]);

  // Colors
  const nodeColors = useMemo(
    () => ({
      fill: colors.nodeBackground,
      stroke: colors.nodeBorder,
      text: colors.nodeForeground,
    }),
    [colors.nodeBackground, colors.nodeBorder, colors.nodeForeground]
  );
  const selectedColors = useMemo(
    () => ({
      fill: colors.nodeBackground,
      stroke: colors.primary,
      text: colors.nodeForeground,
    }),
    [colors.nodeBackground, colors.primary, colors.nodeForeground]
  );
  const connectionColor = useMemo(
    () => ({ stroke: colors.connection }),
    [colors.connection]
  );

  // Find node at point
  const findNodeAtPoint = useCallback(
    (x: number, y: number) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const box = getNodeBox(node);
        if (
          x >= box.left &&
          x <= box.right &&
          y >= box.top &&
          y <= box.bottom
        ) {
          return node;
        }
      }
      return null;
    },
    [nodes]
  );

  // Tap: select node or deselect
  const handleTap = useCallback(
    (x: number, y: number) => {
      const node = findNodeAtPoint(x, y);
      if (node) {
        setSelectedNodeId(node.id);
        setShowChatPanel(false);
        isDraggingNode.value = true; // Enable dragging for selected node
      } else {
        setSelectedNodeId(null);
        isDraggingNode.value = false;
      }
    },
    [findNodeAtPoint, isDraggingNode]
  );

  // Drag: move selected node
  const handleDrag = useCallback(
    (x: number, y: number) => {
      if (selectedNodeId) {
        setDragPosition({ x, y });
      }
    },
    [selectedNodeId]
  );

  // Drag end: persist position
  const handleDragEnd = useCallback(() => {
    if (selectedNodeId && dragPosition && onNodeMove) {
      onNodeMove(selectedNodeId, dragPosition.x, dragPosition.y);
    }
    setDragPosition(null);
  }, [selectedNodeId, dragPosition, onNodeMove]);

  // Open chat panel
  const handleOpenChat = useCallback(() => {
    setShowChatPanel(true);
  }, []);

  // Close selection
  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    setShowChatPanel(false);
    isDraggingNode.value = false;
  }, [isDraggingNode]);

  // Get display position
  const getDisplayPosition = useCallback(
    (node: MindMapNode) => {
      if (node.id === selectedNodeId && dragPosition) {
        return dragPosition;
      }
      return node.position ?? { x: 0, y: 0 };
    },
    [selectedNodeId, dragPosition]
  );

  // Render content
  const renderContent = useCallback(
    (visibleNodes: MindMapNode[]) => {
      const visibleIds = new Set(visibleNodes.map((n) => n.id));

      const connections = edges
        .filter(
          (e) =>
            nodeMap.has(e.from) &&
            nodeMap.has(e.to) &&
            (visibleIds.has(e.from) || visibleIds.has(e.to))
        )
        .map((e) => {
          const fromNode = nodeMap.get(e.from)!;
          const toNode = nodeMap.get(e.to)!;
          return (
            <Connection
              key={`${e.from}-${e.to}`}
              fromNode={{ ...fromNode, position: getDisplayPosition(fromNode) }}
              toNode={{ ...toNode, position: getDisplayPosition(toNode) }}
              colors={connectionColor}
            />
          );
        });

      const nodeElements = visibleNodes.map((node) => {
        const isSelected = node.id === selectedNodeId;
        return (
          <Node
            key={node.id}
            node={{ ...node, position: getDisplayPosition(node) }}
            colors={isSelected ? selectedColors : nodeColors}
            isSelected={isSelected}
          />
        );
      });

      return (
        <>
          {connections}
          {nodeElements}
        </>
      );
    },
    [
      edges,
      nodeMap,
      connectionColor,
      selectedNodeId,
      selectedColors,
      nodeColors,
      getDisplayPosition,
    ]
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      onLayout={(e) =>
        setCanvasSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <GestureHandler
        isDraggingNode={isDraggingNode}
        onTap={handleTap}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {(matrix) => (
          <Canvas style={{ flex: 1 }}>
            <Group matrix={matrix}>
              <ViewportCulling
                matrix={matrix}
                nodes={nodes}
                screenSize={canvasSize}
              >
                {renderContent}
              </ViewportCulling>
            </Group>
          </Canvas>
        )}
      </GestureHandler>

      {/* Float box - shown when node selected but chat panel closed */}
      {selectedNode && !showChatPanel && (
        <NodeFloatBox
          node={selectedNode}
          colors={colors}
          onOpenChat={handleOpenChat}
          onClose={handleClose}
        />
      )}

      {/* Full chat panel */}
      {showChatPanel && (
        <NodeSelectionPanel
          selectedNode={selectedNode}
          colors={colors}
          relatedNodes={relatedNodes}
          documentId={documentId}
          onClose={handleClose}
        />
      )}
    </View>
  );
};

export default MobileCanvas;
