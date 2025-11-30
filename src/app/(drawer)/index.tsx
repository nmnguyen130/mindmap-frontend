import { View, Text, ScrollView } from 'react-native';
import { Link, router, useNavigation } from 'expo-router';
import { useEffect, useRef, useMemo } from 'react';
import { DrawerActions } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Header from '@/components/layout/header';
import { useMindMapStore } from '@/features/mindmap/store/mindmap-store';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useTheme } from '@/components/providers/theme-provider';
import ActionButton from '@/components/ui/action-button';
import StatisticsCard from '@/components/home/statistics-card';
import MindMapCard from '@/components/home/mindmap-card';

const HomeScreen = () => {
  const { getMapsList, loadMaps, isLoading, error } = useMindMapStore();
  const { user, isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  // Get maps list from store
  const maps = getMapsList();

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalMaps = maps.length;
    const totalNodes = maps.reduce((sum, map) => sum + map.nodes.length, 0);
    // For documents, we'll use 0 for now since RAG is backend only
    const totalDocuments = 0;

    return { totalMaps, totalNodes, totalDocuments };
  }, [maps]);

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

  // Gradient colors for different themes
  const heroGradient: [string, string] = isDark
    ? ['#1e3a8a', '#312e81'] // Dark blue gradient
    : ['#3b82f6', '#8b5cf6']; // Blue to purple

  const statGradients: [string, string][] = [
    isDark ? ['#0891b2', '#0e7490'] : ['#06b6d4', '#0891b2'], // Cyan
    isDark ? ['#7c3aed', '#6d28d9'] : ['#8b5cf6', '#7c3aed'], // Purple
    isDark ? ['#059669', '#047857'] : ['#10b981', '#059669'], // Green
  ];

  const accentColors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Mind Mapping" onMenuPress={handleMenuPress} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pb-5">
          {/* Hero Section with Gradient */}
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 pt-6 pb-8 mb-5"
          >
            <Text
              className="text-xs font-semibold uppercase mb-2 tracking-wider"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {isAuthenticated ? 'Welcome Back' : 'Welcome'}
            </Text>

            <Text
              className="text-3xl font-bold mb-2"
              style={{ color: '#ffffff' }}
            >
              {isAuthenticated && user?.email
                ? user.email.split('@')[0]
                : 'Mind Mapping'}
            </Text>

            <Text
              className="text-sm leading-5"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              Capture, organize, and connect your ideas with powerful AI-assisted mind mapping
            </Text>
          </LinearGradient>

          <View className="px-5">
            {/* Statistics Section */}
            <View className="mb-6">
              <Text
                className="text-xs font-semibold uppercase mb-3 tracking-wide"
                style={{ color: colors.mutedForeground }}
              >
                Your Activity
              </Text>

              <View className="flex-row gap-3">
                <StatisticsCard
                  label="Mind Maps"
                  value={statistics.totalMaps}
                  icon="map"
                  gradientColors={statGradients[0]}
                  delay={0}
                />
                <StatisticsCard
                  label="Documents"
                  value={statistics.totalDocuments}
                  icon="description"
                  gradientColors={statGradients[2]}
                  delay={200}
                />
              </View>
            </View>

            {/* Quick actions */}
            <View className="mb-6">
              <Text
                className="text-xs font-semibold uppercase mb-3 tracking-wide"
                style={{ color: colors.mutedForeground }}
              >
                Quick Actions
              </Text>

              <ActionButton
                title="Create New Mind Map"
                description="Start from a blank canvas"
                icon="add-circle-outline"
                variant="primary"
                onPress={handleCreateMindMap}
                className="mb-3"
              />

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <ActionButton
                    title="Demo Map"
                    description="Explore example"
                    icon="play-circle-outline"
                    variant="success"
                    onPress={handleOpenDemoMindMap}
                  />
                </View>
                <View className="flex-1">
                  <ActionButton
                    title="Store Manager"
                    description="Manage data"
                    icon="storage"
                    variant="warning"
                    onPress={() => router.push('/mindmap/store-manager')}
                  />
                </View>
              </View>

              {!isAuthenticated && (
                <View
                  className="flex-row items-center justify-center rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 1,
                    borderColor: colors.primary + '40',
                  }}
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
              )}
            </View>

            {/* Loading State */}
            {isLoading && (
              <View className="items-center py-8">
                <MaterialIcons
                  name="hourglass-empty"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text
                  className="text-center mt-3 text-sm"
                  style={{ color: colors.mutedForeground }}
                >
                  Loading your mind maps...
                </Text>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View
                className="p-4 rounded-xl mb-4 flex-row items-center"
                style={{
                  backgroundColor: colors.error + '15',
                  borderWidth: 1,
                  borderColor: colors.error + '40',
                }}
              >
                <MaterialIcons name="error-outline" size={20} color={colors.error} />
                <Text
                  className="flex-1 ml-3 text-sm"
                  style={{ color: colors.error }}
                >
                  {error}
                </Text>
              </View>
            )}

            {/* Mind maps list */}
            {!isLoading && !error && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: colors.mutedForeground }}
                  >
                    Recent Mind Maps ({maps.length})
                  </Text>
                  {maps.length > 5 && (
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: colors.primary }}
                    >
                      View All
                    </Text>
                  )}
                </View>

                {maps.length === 0 ? (
                  <View
                    className="p-8 rounded-2xl items-center"
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                    }}
                  >
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center mb-4"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(59, 130, 246, 0.1)'
                          : 'rgba(59, 130, 246, 0.05)',
                      }}
                    >
                      <MaterialIcons
                        name="scatter-plot"
                        size={40}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      className="text-base font-semibold mb-2"
                      style={{ color: colors.foreground }}
                    >
                      No mind maps yet
                    </Text>
                    <Text
                      className="text-center text-sm mb-4"
                      style={{ color: colors.mutedForeground }}
                    >
                      Create your first mind map to start organizing your ideas
                    </Text>
                    <ActionButton
                      title="Create First Mind Map"
                      icon="add-circle"
                      variant="primary"
                      onPress={handleCreateMindMap}
                      compact
                    />
                  </View>
                ) : (
                  <>
                    {maps.slice(0, 5).map((map, index) => (
                      <MindMapCard
                        key={map.id}
                        id={map.id}
                        title={map.title}
                        nodeCount={map.nodes.length}
                        updatedAt={map.updatedAt}
                        accentColor={accentColors[index % accentColors.length]}
                        onPress={() => handleOpenMindMap(map.id)}
                      />
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;