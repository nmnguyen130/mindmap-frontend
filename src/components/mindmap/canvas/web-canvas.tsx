import {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  Panel,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import React, { useCallback, useMemo } from "react";

import { MindMapNode, useMindMapStore } from "@/stores/mindmaps";
import "@xyflow/react/dist/style.css";

interface WebCanvasProps {
  mindMapId: string;
  nodes: MindMapNode[];
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onNodeDelete: (id: string) => void;
  onConnectionAdd: (from: string, to: string) => void;
  onConnectionDelete: (connectionId: string) => void;
}

// Convert MindMapNode to ReactFlow Node with better styling
const convertToReactFlowNode = (node: MindMapNode): Node => ({
  id: node.id,
  type: "default",
  position: node.position,
  data: {
    label: (
      <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 min-w-[120px] text-center">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {node.text}
        </div>
      </div>
    ),
  },
  style: {
    background: "transparent",
    border: "none",
    width: "auto",
    height: "auto",
  },
});

// Convert connections to ReactFlow Edges with better styling
const convertToReactFlowEdges = (nodes: MindMapNode[]): Edge[] => {
  const edges: Edge[] = [];
  nodes.forEach((node) => {
    node.connections.forEach((targetId) => {
      edges.push({
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "#3b82f6",
          strokeWidth: 2,
        },
        className: "stroke-blue-500",
      });
    });
  });
  return edges;
};

export default function WebCanvas({
  mindMapId,
  nodes,
  onNodeUpdate,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
}: WebCanvasProps) {
  const { addNode } = useMindMapStore();
  const reactFlowNodes = useMemo(
    () => nodes.map(convertToReactFlowNode),
    [nodes]
  );
  const reactFlowEdges = useMemo(() => convertToReactFlowEdges(nodes), [nodes]);

  const [rfNodes, , onRfNodesChange] = useNodesState(reactFlowNodes);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState(reactFlowEdges);

  // Sync ReactFlow nodes back to our state
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onRfNodesChange(changes);
      // Update our state when nodes change
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          onNodeUpdate(change.id, { position: change.position });
        }
      });
    },
    [onRfNodesChange, onNodeUpdate]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onRfEdgesChange(changes);
    },
    [onRfEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnectionAdd(connection.source, connection.target);
        setRfEdges((eds) => addEdge(connection, eds));
      }
    },
    [onConnectionAdd, setRfEdges]
  );

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Handle node editing - could open a modal for inline editing
      console.log("Node double-clicked for editing:", node.id);
      // TODO: Implement inline editing or modal
    },
    []
  );

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Add new node at clicked position using SQLite store
      const reactFlowBounds = (
        event.target as HTMLElement
      ).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      addNode(mindMapId, {
        text: "New Node",
        position,
        connections: [],
      });
    },
    [addNode, mindMapId]
  );

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneDoubleClick={handlePaneDoubleClick}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          nodeColor={() => "#3b82f6"}
          maskColor="rgba(59, 130, 246, 0.1)"
        />
        <Background variant="dots" gap={16} size={1} color="#d1d5db" />
        <Panel
          position="top-left"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 m-2"
        >
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="font-medium">SQLite-Powered Canvas:</div>
            <div>• Double-click canvas to add node</div>
            <div>• Double-click node to edit</div>
            <div>• Drag from node edge to connect</div>
            <div>• All data persists offline</div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
