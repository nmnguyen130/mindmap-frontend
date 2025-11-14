import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const MindMapLayout = () => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[id]" />
        <Stack.Screen name="create" />
        <Stack.Screen name="store-manager" options={{ title: "Store Manager" }} />
      </Stack>
    </SafeAreaView>
  )
}

export default MindMapLayout;
