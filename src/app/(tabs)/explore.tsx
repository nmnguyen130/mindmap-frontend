import { View, Text } from 'react-native'

const ExploreScreen = () => {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-black">
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Explore Mind Maps
      </Text>
      <Text className="text-sm mt-2 text-gray-500">
        Public mind maps coming soon...
      </Text>
    </View>
  )
}

export default ExploreScreen;
