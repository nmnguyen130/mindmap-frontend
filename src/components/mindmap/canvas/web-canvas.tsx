import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Connection,
  EdgeChange,
  NodeChange,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { MindMapNode } from '@/stores/mindmaps'

interface WebCanvasProps {
  nodes: MindMapNode[]
  onNodeAdd: (node: Omit<MindMapNode, 'id'>) => void
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void
  onNodeDelete: (id: string) => void
  onConnectionAdd: (from: string, to: string) => void
  onConnectionDelete: (connectionId: string) => void
}

// Convert MindMapNode to ReactFlow Node
const convertToReactFlowNode = (node: MindMapNode): Node => ({
  id: node.id,
  type: 'default',
  position: node.position,
  data: { label: node.text },
})

// Convert connections to ReactFlow Edges
const convertToReactFlowEdges = (nodes: MindMapNode[]): Edge[] => {
  const edges: Edge[] = []
  nodes.forEach(node => {
    node.connections.forEach(targetId => {
      edges.push({
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
      })
    })
  })
  return edges
}

export default function WebCanvas({
  nodes,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
}: WebCanvasProps) {
  const reactFlowNodes = useMemo(() => nodes.map(convertToReactFlowNode), [nodes])
  const reactFlowEdges = useMemo(() => convertToReactFlowEdges(nodes), [nodes])

  const [rfNodes, , onRfNodesChange] = useNodesState(reactFlowNodes)
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState(reactFlowEdges)

  // Sync ReactFlow nodes back to our state
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onRfNodesChange(changes)
    // Update our state when nodes change
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        onNodeUpdate(change.id, { position: change.position })
      }
    })
  }, [onRfNodesChange, onNodeUpdate])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onRfEdgesChange(changes)
  }, [onRfEdgesChange])

  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      onConnectionAdd(connection.source, connection.target)
      setRfEdges((eds) => addEdge(connection, eds))
    }
  }, [onConnectionAdd, setRfEdges])

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Handle node editing
    console.log('Node clicked:', node.id)
  }, [])

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    // Add new node on double click
    if (event.detail === 2) {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      onNodeAdd({
        text: 'New Node',
        position,
        connections: [],
      })
    }
  }, [onNodeAdd])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  )
}
