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

import { MindMapNode, MindmapData } from "@/stores/mindmap";
import "@xyflow/react/dist/style.css";

interface WebCanvasProps {
  nodes: MindMapNode[];
  edges: MindmapData['edges'];
}

// Convert MindMapNode to ReactFlow Node with better styling
const convertToReactFlowNode = (node: MindMapNode): Node => ({
  id: node.id,
  type: "default",
  position: node.position || { x: 0, y: 0 },
  data: {
    label: (
      <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 min-w-[120px] text-center">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {node.label}
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
const convertToReactFlowEdges = (edges: MindmapData['edges']): Edge[] => {
  return edges.map((edge) => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
    className: "stroke-blue-500",
  }));
};

const WebCanvas = ({ nodes, edges }: WebCanvasProps) => {
  const reactFlowNodes = useMemo(
    () => nodes.map(convertToReactFlowNode),
    [nodes]
  );
  const reactFlowEdges = useMemo(() => convertToReactFlowEdges(edges), [edges]);

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
