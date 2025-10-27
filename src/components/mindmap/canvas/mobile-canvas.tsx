import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Canvas, Circle, Text, Skia, useTouchHandler, Path } from '@shopify/react-native-skia'

import { MindMapNode } from '@/stores/mindmaps'

interface MobileCanvasProps {
  nodes: MindMapNode[]
  onNodeAdd: (node: Omit<MindMapNode, 'id'>) => void
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void
  onNodeDelete: (id: string) => void
  onConnectionAdd: (from: string, to: string) => void
  onConnectionDelete: (connectionId: string) => void
}

const NODE_RADIUS = 50

export default function MobileCanvas({
  nodes,
  onNodeAdd,
  onNodeUpdate,
  onConnectionDelete,
}: MobileCanvasProps) {
  const touchHandler = useTouchHandler({
    onStart: (touch) => {
      // Check if tapping on a node
      const tappedNode = nodes.find(node => {
        const dx = touch.x - node.position.x
        const dy = touch.y - node.position.y
        return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS
      })

      if (tappedNode) {
        console.log('Node tapped:', tappedNode.id)
        // TODO: Handle node selection/editing
      } else {
        // Add new node
        onNodeAdd({
          text: 'New Node',
          position: { x: touch.x, y: touch.y },
          connections: [],
        })
      }
    },
  })

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas} onTouch={touchHandler}>
        {/* Draw connections */}
        {nodes.map(node =>
          node.connections.map(targetId => {
            const targetNode = nodes.find(n => n.id === targetId)
            if (!targetNode) return null

            const path = Skia.Path.Make()
            path.moveTo(node.position.x, node.position.y)
            path.lineTo(targetNode.position.x, targetNode.position.y)

            return (
              <Path
                key={`${node.id}-${targetId}`}
                path={path}
                style="stroke"
                strokeWidth={2}
                color="blue"
              />
            )
          })
        )}

        {/* Draw nodes */}
        {nodes.map(node => (
          <React.Fragment key={node.id}>
            <Circle
              cx={node.position.x}
              cy={node.position.y}
              r={NODE_RADIUS}
              color="lightblue"
              style="fill"
            />
            <Circle
              cx={node.position.x}
              cy={node.position.y}
              r={NODE_RADIUS}
              color="blue"
              style="stroke"
              strokeWidth={2}
            />
            <Text
              x={node.position.x - NODE_RADIUS / 2}
              y={node.position.y + 5}
              text={node.text}
              fontSize={14}
              color="black"
            />
          </React.Fragment>
        ))}
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
})
