import { View, Text, Pressable } from 'react-native'

import { useAuthStore } from '@/stores'

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
  }

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Profile
      </Text>

      {isAuthenticated && user ? (
        <>
          <Text className="text-lg text-gray-900 dark:text-gray-100 mb-2">
            Welcome, {user.name || user.email}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-6">
            {user.email}
          </Text>
          <Pressable
            className="w-full p-3 bg-red-500 rounded-lg"
            onPress={handleLogout}
          >
            <Text className="text-white text-center font-semibold">
              Logout
            </Text>
          </Pressable>
        </>
      ) : (
        <Text className="text-gray-600 dark:text-gray-400">
          Not logged in
        </Text>
      )}
    </View>
  )
}
