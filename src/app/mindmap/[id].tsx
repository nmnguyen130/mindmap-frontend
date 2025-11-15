import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import Header from "@/components/layout/header";
import Canvas from "@/components/mindmap/canvas/canvas";
import ActionButton from "@/components/ui/action-button";
import BottomSheet from "@/components/ui/bottom-sheet";
import InfoBadge from "@/components/ui/info-badge";
import { useTheme } from "@/components/providers/theme-provider";
import { defaultMindMap } from "@/data/default-mindmap";
import { useMindMapStore } from "@/stores/mindmaps";

const MindMapScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { maps, currentMap, loadMap, isLoading, error } = useMindMapStore();
  const [isActionsSheetVisible, setIsActionsSheetVisible] = useState(false);

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

  const handleBackPress = () => {
    router.back();
  };

  const nodeCount = map?.nodes.length ?? 0;
  const connectionCount =
    map?.nodes.reduce((total, node) => total + node.connections.length, 0) ?? 0;

  const rootNodes = useMemo(() => {
    if (!map) return [];

    const targets = new Set<string>();
    map.nodes.forEach((node) => {
      node.connections.forEach((targetId) => {
        targets.add(targetId);
      });
    });

    return map.nodes.filter((node) => !targets.has(node.id));
  }, [map]);

  const renderStatus = (title: string, message: string) => (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={title}
        onMenuPress={() => {}}
        showBackButton
        onBackPress={handleBackPress}
      />
      <View className="flex-1 items-center justify-center px-6">
        <Text
          className="text-base text-center"
          style={{ color: colors.mutedForeground }}
        >
          {message}
        </Text>
      </View>
    </View>
  );

  if (isLoading && !isDemo) {
    return renderStatus("Loading mind map", "Loading mind map...");
  }

  if (error && !isDemo) {
    return renderStatus("Mind map error", `Error: ${error}`);
  }

  if (!map) {
    return renderStatus("Mind map", "Mind map not found");
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={map.title}
        onMenuPress={() => {}}
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
        className="px-4 py-3 border-b"
        style={{
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View className="flex-row items-start justify-between gap-4 flex-wrap">
          <View className="flex-1 min-w-[180px]">
            <View className="flex-row items-center flex-wrap gap-x-2 gap-y-1">
              <Text
                className="text-[11px] font-semibold uppercase"
                style={{ color: colors.mutedForeground }}
              >
                Overview
              </Text>
              {isDemo && (
                <View className="px-2 py-0.5 rounded-full bg-orange-100">
                  <Text className="text-[11px] font-semibold text-orange-700">
                    Demo - View Only
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-1 flex-row flex-wrap gap-x-3 gap-y-1">
              <InfoBadge label="Nodes" value={nodeCount.toString()} />
              <InfoBadge
                label="Connections"
                value={connectionCount.toString()}
              />
            </View>
          </View>

          {rootNodes.length > 0 && (
            <View className="flex-1 min-w-[160px]">
              <Text
                className="text-[11px] font-semibold uppercase mb-1 text-right"
                style={{ color: colors.mutedForeground }}
              >
                Key topics
              </Text>
              <View className="flex-row flex-wrap gap-2 justify-end">
                {rootNodes.slice(0, 4).map((node) => (
                  <View
                    key={node.id}
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.secondary }}
                  >
                    <Text
                      className="text-[11px] font-medium"
                      style={{ color: colors.secondaryForeground }}
                      numberOfLines={1}
                    >
                      {node.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      <View className="flex-1">
        <Canvas nodes={map.nodes} />
      </View>

      <BottomSheet
        visible={isActionsSheetVisible}
        title="Mind map actions"
        onClose={() => setIsActionsSheetVisible(false)}
        snapRatio={0.6}
      >
        <View className="space-y-2">
          <ActionButton
            title="Rename (coming soon)"
            description="Give this mind map a clearer title."
            onPress={() => {
              console.log("Rename mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          <ActionButton
            title="Duplicate (coming soon)"
            description="Create a copy to experiment freely."
            onPress={() => {
              console.log("Duplicate mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          <ActionButton
            title="Export (coming soon)"
            description="Export this mind map to share or back up."
            onPress={() => {
              console.log("Export mind map - coming soon");
              setIsActionsSheetVisible(false);
            }}
            compact
          />

          {!isDemo && (
            <ActionButton
              title="Delete (coming soon)"
              description="Remove this mind map from your library."
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
