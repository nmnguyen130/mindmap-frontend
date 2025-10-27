import { Platform } from 'react-native'

import { MindMapNode } from '@/stores/mindmaps'

import WebCanvas from './web-canvas'
import MobileCanvas from './mobile-canvas'

interface CanvasProps {
  nodes: MindMapNode[]
  onNodeAdd: (node: Omit<MindMapNode, 'id'>) => void
  onNodeUpdate: (id: string, updates: Partial<MindMapNode>) => void
  onNodeDelete: (id: string) => void
  onConnectionAdd: (from: string, to: string) => void
  onConnectionDelete: (connectionId: string) => void
}

export default function Canvas(props: CanvasProps) {
  if (Platform.OS === 'web') {
    return <WebCanvas {...props} />
  } else {
    return <MobileCanvas {...props} />
  }
}
