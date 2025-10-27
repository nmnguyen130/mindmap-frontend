import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { useMindMapStore } from '@/stores'
import Canvas from '@/components/mindmap/canvas/canvas'

export default function MindMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { maps } = useMindMapStore()

  const map = maps.find(m => m.id === id)

  if (!map) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Mind map not found
        </Text>
      </View>
    )
  }

  const handleNodeAdd = (node: Omit<any, 'id'>) => {
    // TODO: Implement node addition
    console.log('Add node:', node)
  }

  const handleNodeUpdate = (nodeId: string, updates: any) => {
    // TODO: Implement node update
    console.log('Update node:', nodeId, updates)
  }

  const handleNodeDelete = (nodeId: string) => {
    // TODO: Implement node deletion
    console.log('Delete node:', nodeId)
  }

  const handleConnectionAdd = (from: string, to: string) => {
    // TODO: Implement connection addition
    console.log('Add connection:', from, to)
  }

  const handleConnectionDelete = (connectionId: string) => {
    // TODO: Implement connection deletion
    console.log('Delete connection:', connectionId)
  }

  return (
    <View className="flex-1">
      <View className="p-4 bg-gray-100 dark:bg-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {map.title}
        </Text>
      </View>
      <Canvas
        nodes={map.nodes}
        onNodeAdd={handleNodeAdd}
        onNodeUpdate={handleNodeUpdate}
        onNodeDelete={handleNodeDelete}
        onConnectionAdd={handleConnectionAdd}
        onConnectionDelete={handleConnectionDelete}
      />
    </View>
  )
}
