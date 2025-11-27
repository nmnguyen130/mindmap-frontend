import { View, Text, ScrollView } from 'react-native';
import { Link, router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { DrawerActions } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '@/components/layout/header';
import { useMindMapStore } from '@/stores/mindmap';
import { useTheme } from '@/components/providers/theme-provider';
import ActionButton from '@/components/ui/action-button';
import MindMapListItem from '@/components/home/mindmap-list-item';

const HomeScreen = () => {
  const { maps, loadMaps, isLoading, error } = useMindMapStore();
  const { colors } = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  const handleCreateMindMap = () => {
    router.push('/mindmap/create');
  };

  const handleOpenMindMap = (id: string) => {
    router.push(`/mindmap/${id}`);
  };

  const handleOpenDemoMindMap = () => {
    router.push('/mindmap/default');
  };

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Mind Mapping" onMenuPress={handleMenuPress} />
      <ScrollView className="flex-1">
        <View className="p-5">
          {/* Hero */}
          <View
            className="rounded-2xl px-4 py-5 mb-5"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-xs font-semibold uppercase mb-1"
              style={{ color: colors.mutedForeground }}
            >
              Welcome
            </Text>
            <Text
              className="text-2xl font-bold mb-1"
              style={{ color: colors.primary }}
            >
              Mind Mapping App
            </Text>
            <Text
              className="text-sm"
              style={{ color: colors.mutedForeground }}
            >
              SQLite-powered offline storage to capture, organize, and connect
              your ideas.
            </Text>
          </View>

          {/* Quick actions */}
          <View className="mb-6">
            <Text
              className="text-xs font-semibold uppercase mb-3"
              style={{ color: colors.mutedForeground }}
            >
              Quick actions
            </Text>

            <ActionButton
              title="Create New Mind Map"
              description="Start from a blank canvas."
              icon="add-circle-outline"
              variant="primary"
              onPress={handleCreateMindMap}
              className="mb-3"
            />

            <ActionButton
              title="View Demo Mind Map"
              description="Explore a pre-built example."
              icon="play-circle-outline"
              variant="success"
              onPress={handleOpenDemoMindMap}
              className="mb-3"
            />

            <ActionButton
              title="Store Manager"
              description="Inspect and manage stored data."
              icon="storage"
              variant="warning"
              onPress={() => router.push('/mindmap/store-manager')}
              compact
            />
            <View
              className="mt-1 flex-row items-center justify-center rounded-xl px-4 py-3"
              style={{ backgroundColor: colors.surface }}
            >
              <MaterialIcons
                name="cloud-sync"
                size={18}
                color={colors.primary}
              />
              <Link
                href="/login"
                className="ml-2 text-xs font-semibold"
                style={{ color: colors.primary }}
              >
                Login to sync across devices
              </Link>
            </View>
          </View>

          {isLoading && (
            <Text
              className="text-center mb-4"
              style={{ color: colors.mutedForeground }}
            >
              Loading mind maps from SQLite...
            </Text>
          )}

          {error && (
            <View
              className="p-4 rounded-xl mb-4"
              style={{ backgroundColor: colors.error + '20' }}
            >
              <Text
                className="text-center text-sm"
                style={{ color: colors.error }}
              >
                Error: {error}
              </Text>
            </View>
          )}

          {/* Mind maps list */}
          <View className="mb-4">
            <Text
              className="text-xs font-semibold uppercase mb-3"
              style={{ color: colors.mutedForeground }}
            >
              Your Mind Maps ({maps.length})
            </Text>

            {maps.length === 0 && !isLoading && (
              <View
                className="p-6 rounded-xl items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <MaterialIcons
                  name="scatter-plot"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text
                  className="mt-3 text-center"
                  style={{ color: colors.mutedForeground }}
                >
                  No mind maps yet. Create your first one!
                </Text>
              </View>
            )}

            {maps.map((map) => (
              <MindMapListItem
                key={map.id}
                title={map.title}
                nodeCount={map.nodes.length}
                updatedAtLabel={map.updatedAt.toLocaleDateString()}
                surfaceColor={colors.surface}
                borderColor={colors.border}
                foregroundColor={colors.foreground}
                mutedColor={colors.mutedForeground}
                onPress={() => handleOpenMindMap(map.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default HomeScreen;