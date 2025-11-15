import { Text, View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";

export interface InfoBadgeProps {
  label: string;
  value: string;
}

const InfoBadge = ({ label, value }: InfoBadgeProps) => {
  const { colors } = useTheme();

  return (
    <View
      className="px-3 py-1 rounded-full mb-1"
      style={{ backgroundColor: colors.secondary }}
    >
      <Text
        className="text-[11px] font-semibold"
        style={{ color: colors.secondaryForeground }}
      >
        {label}: {value}
      </Text>
    </View>
  );
};

export default InfoBadge;
