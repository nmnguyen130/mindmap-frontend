import { View, Text } from 'react-native'
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-black">
      <Text className="text-2xl font-bold text-blue-500 mb-4">
        Mind Mapping App
      </Text>
      <Link href="/login" className="text-blue-500 underline">
        Login
      </Link>
      <Link href="/mindmap/create" className="text-blue-500 underline mt-2">
        Create Mind Map
      </Link>
    </View>
  )
}
