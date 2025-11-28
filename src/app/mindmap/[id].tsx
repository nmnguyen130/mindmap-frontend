import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import Header from "@/components/layout/header";
import Canvas from "@/components/mindmap/canvas/canvas";
import { useTheme } from "@/components/providers/theme-provider";
import ActionButton from "@/components/ui/action-button";
import BottomSheet from "@/components/ui/bottom-sheet";
import InfoBadge from "@/components/ui/info-badge";
import { defaultMindMap } from "@/data/default-mindmap";
import { useMindMapStore, type MindMapNode } from "@/stores/mindmap";

const MindMapScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { maps, currentMap, loadMap, autoLayoutMap, isLoading, error } = useMindMapStore();
  const [isActionsSheetVisible, setIsActionsSheetVisible] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);

  const handleAutoLayout = async () => {
    if (!id || typeof id !== 'string') return;

    setIsLayouting(true);
    try {
      await autoLayoutMap(id);
      // Optional: Show success message
      console.log('Layout applied successfully');
    } catch (error) {
      console.error('Auto-layout failed:', error);
      // Optional: Show error alert
    } finally {
      setIsLayouting(false);
    }
  };

  useEffect(() => {
    if (id && id !== "default") {
      loadMap(id).catch((err) => {
        console.error("Load map error:", err);
      });
    }
  }, [id, loadMap]);

  const map = useMemo(() => {
    if (id === "default") {
      return defaultMindMap;
    }

    return currentMap || maps.find((m) => m.id === id) || null;
  }, [id, currentMap, maps]);

  const isDemo = id === "default";

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const nodeCount = map?.nodes.length ?? 0;
  const connectionCount = map?.edges.length ?? 0;

  const rootNodes = useMemo(() => {
    if (!map) return [];
    // Root nodes are those with no parent_id
    return map.nodes.filter((node: MindMapNode) => !node.parent_id);
  }, [map]);

  const renderStatus = useCallback(
    (title: string, message: string, showLoading = false) => (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title={title}
          onMenuPress={() => { }}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          {showLoading && (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginBottom: 16 }}
            />
          )}
          <Text
            className="text-base text-center"
            style={{ color: colors.mutedForeground }}
          >
            {message}
          </Text>
        </View>
      </View>
    ),
    [colors, handleBackPress]
  );

  if (isLoading && !isDemo) {
    return renderStatus("Loading", "Loading mind map...", true);
  }

  if (error && !isDemo) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title="Error"
          onMenuPress={() => { }}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons
            name="error-outline"
            size={64}
            color={colors.error}
            style={{ marginBottom: 16 }}
          />
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
            Failed to load mind map
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.mutedForeground }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (!map) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header
          title="Not Found"
          onMenuPress={() => { }}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons
            name="search-off"
            size={64}
            color={colors.mutedForeground}
            style={{ marginBottom: 16 }}
          />
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
            Mind map not found
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.mutedForeground }}>
            The mind map you're looking for doesn't exist or has been deleted.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={map.title}
        onMenuPress={() => { }}
        showBackButton
        onBackPress={handleBackPress}
        rightAction={{
          icon: "more-vert",
          onPress: () => {
            setIsActionsSheetVisible(true);
          },
        }}
      />

      <View
        className="px-4 py-2.5 border-b"
        style={{
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {/* Row 1: Demo badge and Info badges */}
        <View className="flex-row items-center gap-2 mb-2">
          {isDemo && (
            <View className="px-2.5 py-1 rounded-full bg-orange-100">
              <Text className="text-xs font-bold text-orange-700 uppercase">
                Demo
              </Text>
            </View>
          )}
          <InfoBadge label="Nodes" value={nodeCount.toString()} />
          <InfoBadge label="Links" value={connectionCount.toString()} />
        </View>

        {/* Row 2: Root nodes and Auto Layout button */}
        <View className="flex-row items-center justify-between gap-3">
          {rootNodes.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 flex-1">
              {rootNodes.slice(0, 3).map((node: MindMapNode) => (
                <View
                  key={node.id}
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: colors.secondaryForeground }}
                    numberOfLines={1}
                  >
                    {node.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={handleAutoLayout}
            disabled={isLayouting || isLoading}
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: isLayouting || isLoading ? '#94a3b8' : '#3b82f6',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
              {isLayouting ? 'Layouting...' : 'Auto Layout'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-1">
        {map.nodes.length > 0 ? (
          <Canvas nodes={map.nodes} edges={map.edges} />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons
              name="bubble-chart"
              size={64}
              color={colors.mutedForeground}
              style={{ marginBottom: 16 }}
            />
            <Text className="text-base font-semibold mb-1" style={{ color: colors.foreground }}>
              Empty mind map
            </Text>
            <Text className="text-sm text-center" style={{ color: colors.mutedForeground }}>
              No nodes to display yet
            </Text>
          </View>
        )}
      </View>

      <BottomSheet
        visible={isActionsSheetVisible}
        title="Mind map actions"
        onClose={() => setIsActionsSheetVisible(false)}
        snapRatio={0.6}
      >
        <View className="gap-2">
          <ActionButton
            title="Rename"
            description="Give this mind map a clearer title"
            onPress={() => {
              console.log("Rename mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          <ActionButton
            title="Duplicate"
            description="Create a copy to experiment freely"
            onPress={() => {
              console.log("Duplicate mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          <ActionButton
            title="Export"
            description="Export this mind map to share or back up"
            onPress={() => {
              console.log("Export mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          {!isDemo && (
            <ActionButton
              title="Delete"
              description="Remove this mind map from your library"
              variant="danger"
              onPress={() => {
                console.log("Delete mind map - coming soon");
                setIsActionsSheetVisible(false);
              }}
              compact
            />
          )}
        </View>

        <Pressable
          className="mt-4 py-2 rounded-full items-center"
          onPress={() => setIsActionsSheetVisible(false)}
          style={{ backgroundColor: colors.secondary }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.secondaryForeground }}
          >
            Close
          </Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
};

export default MindMapScreen;
