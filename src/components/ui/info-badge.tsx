import { Text, View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";

export interface InfoBadgeProps {
  label: string;
  value: string;
}

const InfoBadge = ({ label, value }: InfoBadgeProps) => {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs font-medium" style={{ color: colors.mutedForeground }}>
        {label}:
      </Text>
      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.secondary }}>
        <Text className="text-xs font-bold" style={{ color: colors.secondaryForeground }}>
          {value}
        </Text>
      </View>
    </View>
  );
};

export default InfoBadge;
