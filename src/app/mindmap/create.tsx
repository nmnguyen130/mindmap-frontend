import { View, Text, TextInput, Pressable } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'

import { useCreateMindMap } from '@/services/mindmap'
import { useMindMapStore } from '@/stores'

export default function CreateMindMapScreen() {
  const [title, setTitle] = useState('')
  const createMap = useCreateMindMap()
  const { setCurrentMap } = useMindMapStore()

  const handleCreate = async () => {
    if (!title.trim()) return

    try {
      const newMap = await createMap.mutateAsync({
        title: title.trim(),
        nodes: []
      })
      setCurrentMap(newMap)
      router.push(`/mindmap/${newMap.id}`)
    } catch (error) {
      console.error('Create failed:', error)
    }
  }

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Create New Mind Map
      </Text>

      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="Mind Map Title"
        value={title}
        onChangeText={setTitle}
      />

      <Pressable
        className="w-full p-3 bg-blue-500 rounded-lg"
        onPress={handleCreate}
        disabled={createMap.isPending}
      >
        <Text className="text-white text-center font-semibold">
          {createMap.isPending ? 'Creating...' : 'Create Mind Map'}
        </Text>
      </Pressable>
    </View>
  )
}
