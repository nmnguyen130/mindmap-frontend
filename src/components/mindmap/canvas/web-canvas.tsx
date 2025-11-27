import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";

import { MindMapNode } from "@/stores/mindmaps";
import "@xyflow/react/dist/style.css";

interface WebCanvasProps {
  nodes: MindMapNode[];
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

const WebCanvas = ({ nodes }: WebCanvasProps) => {
  const reactFlowNodes = useMemo(
    () => nodes.map(convertToReactFlowNode),
    [nodes]
  );
  const reactFlowEdges = useMemo(() => convertToReactFlowEdges(nodes), [nodes]);

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default WebCanvas;
