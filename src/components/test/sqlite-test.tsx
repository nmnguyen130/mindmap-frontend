import React from 'react'
import { View, Text } from 'react-native'
import { useMindMapStore } from '@/stores/mindmaps'
import { useTheme } from '@/components/providers/theme-provider'

export default function TestComponent() {
  const { maps, loadMaps, isLoading, error } = useMindMapStore()
  const { colors, theme } = useTheme()

  React.useEffect(() => {
    loadMaps()
  }, [loadMaps])

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>
        SQLite Integration Test
      </Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>
        Theme: {theme}
      </Text>
      
      {isLoading && (
        <Text style={{ color: colors.muted, marginTop: 16 }}>
          Loading from SQLite...
        </Text>
      )}
      
      {error && (
        <Text style={{ color: colors.error, marginTop: 16 }}>
          Error: {error}
        </Text>
      )}
      
      <Text style={{ color: colors.foreground, marginTop: 16 }}>
        Mind Maps ({maps.length}):
      </Text>
      
      {maps.map((map) => (
        <View key={map.id} style={{ marginTop: 8, padding: 12, backgroundColor: colors.surface, borderRadius: 8 }}>
          <Text style={{ color: colors.surfaceForeground, fontWeight: '600' }}>
            {map.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {map.nodes.length} nodes • Created: {map.createdAt.toLocaleDateString()}
          </Text>
        </View>
      ))}
    </View>
  )
}
