import React from "react";
import { Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface FPSMetrics {
  current: number;
  average: number;
}

interface FPSOverlayProps {
  isVisible: boolean;
  metrics: FPSMetrics;
}

const FPSOverlay: React.FC<FPSOverlayProps> = ({ isVisible, metrics }) => {
  if (!isVisible) return null;

  const getFPSColor = (fps: number): string => {
    if (fps >= 50) return "text-green-500";
    if (fps >= 30) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute top-2.5 left-2.5 bg-black/80 rounded-lg px-3 py-3 min-w-[80px] shadow-lg items-center"
    >
      <Text className="text-white text-xs font-bold mb-1">FPS</Text>
      <Text
        className={`text-2xl font-bold mb-0.5 ${getFPSColor(metrics.current)}`}
      >
        {metrics.current}
      </Text>
      <Text className="text-gray-300 text-[10px]">avg: {metrics.average}</Text>
    </Animated.View>
  );
};

export default FPSOverlay;
