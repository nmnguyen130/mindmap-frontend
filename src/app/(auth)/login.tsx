import { View, Text, TextInput, Pressable } from 'react-native'
import { useState } from 'react'

import { useLogin } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const { login: loginStore } = useAuthStore()

  const handleLogin = async () => {
    try {
      await login.mutateAsync({ email, password })
      await loginStore({ email, password })
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Login
      </Text>

      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        className="w-full p-3 bg-blue-500 rounded-lg"
        onPress={handleLogin}
        disabled={login.isPending}
      >
        <Text className="text-white text-center font-semibold">
          {login.isPending ? 'Logging in...' : 'Login'}
        </Text>
      </Pressable>
    </View>
  )
}
