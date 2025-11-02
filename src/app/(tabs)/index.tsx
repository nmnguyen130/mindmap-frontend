import { View, Text, Pressable, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { useEffect } from 'react'

import { useMindMapStore } from '@/stores/mindmaps'

export default function HomeScreen() {
  const { maps, loadMaps, isLoading, error } = useMindMapStore()

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

  const handleCreateMindMap = () => {
    router.push('/mindmap/create')
  }

  const handleOpenMindMap = (id: string) => {
    router.push(`/mindmap/${id}`)
  }

  const handleOpenDemoMindMap = () => {
    router.push('/mindmap/default')
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      <View className="p-6">
        <Text className="text-3xl font-bold text-blue-500 mb-2 text-center">
          Mind Mapping App
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
          SQLite-Powered Offline Storage
        </Text>

        <View className="mb-6">
          <Pressable
            onPress={handleCreateMindMap}
            className="bg-blue-500 p-4 rounded-lg mb-4"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Create New Mind Map
            </Text>
          </Pressable>
          
          <Pressable
            onPress={handleOpenDemoMindMap}
            className="bg-green-500 p-4 rounded-lg mb-4"
          >
            <Text className="text-white text-center font-semibold text-lg">
              View Demo Mind Map
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push('/mindmap/store-manager')}
            className="bg-orange-500 p-3 rounded-lg mb-4"
          >
            <Text className="text-white text-center font-semibold">
              Store Manager
            </Text>
          </Pressable>
          
          <Link href="/login" className="text-blue-500 text-center underline">
            Login
          </Link>
        </View>

        {isLoading && (
          <Text className="text-gray-600 dark:text-gray-400 text-center mb-4">
            Loading mind maps from SQLite...
          </Text>
        )}

        {error && (
          <View className="bg-red-100 dark:bg-red-900 p-4 rounded-lg mb-4">
            <Text className="text-red-600 dark:text-red-400 text-center">
              Error: {error}
            </Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Your Mind Maps ({maps.length})
          </Text>
          
          {maps.length === 0 && !isLoading && (
            <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg items-center">
              <Text className="text-gray-600 dark:text-gray-400 text-center">
                No mind maps yet. Create your first one!
              </Text>
            </View>
          )}

          {maps.map((map) => (
            <Pressable
              key={map.id}
              onPress={() => handleOpenMindMap(map.id)}
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-3 border border-gray-200 dark:border-gray-700"
            >
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {map.title}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {map.nodes.length} nodes • Updated: {map.updatedAt.toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
