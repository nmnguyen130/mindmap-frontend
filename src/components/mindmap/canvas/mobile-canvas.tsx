import { Canvas, Group } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { makeMutable, SharedValue } from "react-native-reanimated";

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

interface NodePosition {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface MobileCanvasProps {
  nodes?: MindMapNode[];
  edges?: MindmapData["edges"];
  mindmapId: string;
  documentId?: string;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
}

// Component

const MobileCanvas = ({
  nodes = [],
  edges = [],
  mindmapId,
  documentId,
  onNodeMove,
}: MobileCanvasProps) => {
  const { colors } = useTheme();

  // UI State
  const selectedNodeIdRef = useRef<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Drag state
  const isDraggingNode = useRef(makeMutable(false)).current;
  const activeNodeId = useRef(makeMutable<string | null>(null)).current;

  // Shared positions
  const positionsRef = useRef(new Map<string, NodePosition>());

  // Sync positions map with nodes
  const nodePositions = useMemo(() => {
    const map = positionsRef.current;

    // Add new nodes
    nodes.forEach((node) => {
      if (!map.has(node.id)) {
        map.set(node.id, {
          x: makeMutable(node.position?.x ?? 0),
          y: makeMutable(node.position?.y ?? 0),
        });
      }
    });

    // Remove stale nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const id of map.keys()) {
      if (!nodeIds.has(id)) map.delete(id);
    }

    return map;
  }, [nodes]);

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
      .filter(Boolean) as MindMapNode[];
  }, [selectedNode, nodeMap, edges]);

  // Colors
  const nodeColors = useMemo(
    () => ({
      fill: colors.nodeBackground,
      stroke: colors.nodeBorder,
      text: colors.nodeForeground,
    }),
    [colors]
  );
  const selectedColors = useMemo(
    () => ({
      fill: colors.nodeBackground,
      stroke: colors.primary,
      text: colors.nodeForeground,
    }),
    [colors]
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
        activeNodeId.value = node.id;
        isDraggingNode.value = true;
        setShowChatPanel(false);
      } else {
        setSelectedNodeId(null);
        activeNodeId.value = null;
        isDraggingNode.value = false;
      }
    },
    [findNodeAtPoint]
  );

  // Persist position (JS only once)
  const handleDragEnd = useCallback(() => {
    const id = activeNodeId.value;
    if (!id || !onNodeMove) return;
    const pos = nodePositions.get(id);
    if (!pos) return;
    onNodeMove(id, pos.x.value, pos.y.value);
  }, [onNodeMove, nodePositions]);

  // Open chat panel
  const handleOpenChat = useCallback(() => {
    setShowChatPanel(true);
  }, []);

  // Close selection
  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    setShowChatPanel(false);
    activeNodeId.value = null;
    isDraggingNode.value = false;
  }, [isDraggingNode]);

  // Render content
  const renderContent = useCallback(
    (visibleNodes: MindMapNode[]) => {
      const visibleIds = new Set(visibleNodes.map((n) => n.id));

      const connections = edges
        .filter((e) => visibleIds.has(e.from) || visibleIds.has(e.to))
        .map((e) => {
          return (
            <Connection
              key={`${e.from}-${e.to}`}
              fromPosition={nodePositions.get(e.from)!}
              toPosition={nodePositions.get(e.to)!}
              colors={connectionColor}
            />
          );
        });

      const nodeElements = visibleNodes.map((node) => {
        const isSelected = node.id === selectedNodeId;
        return (
          <Node
            key={node.id}
            node={node}
            position={nodePositions.get(node.id)!}
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
    [edges, nodeMap, nodePositions, selectedNodeId, nodeColors, selectedColors]
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      onLayout={(e) => setCanvasSize(e.nativeEvent.layout)}
    >
      <GestureHandler
        isDraggingNode={isDraggingNode}
        activeNodeId={activeNodeId}
        nodePositions={nodePositions}
        onTap={handleTap}
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
