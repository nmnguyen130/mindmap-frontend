import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const MindMapLayout = () => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="[id]" options={{ headerShown: true }} />
        <Stack.Screen name="create" options={{ headerShown: true }} />
        <Stack.Screen name="store-manager" options={{ title: "Store Manager", headerShown: true }} />
      </Stack>
    </SafeAreaView>
  )
}

export default MindMapLayout;
