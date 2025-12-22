import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useTheme } from "@/components/providers/theme-provider";

type FabAction = {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
};

type FabButtonProps = {
  actions: FabAction[];
};

/**
 * Floating Action Button with expandable action menu.
 * Icons only, no text labels for minimal design.
 */
const FabButton = ({ actions }: FabButtonProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View className="absolute bottom-6 right-6 z-20 items-end gap-3">
      {open &&
        actions.map((action, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setOpen(false);
              action.onPress();
            }}
            className="items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <MaterialIcons
              name={action.icon}
              size={22}
              color={colors.primary}
            />
          </Pressable>
        ))}

      <Pressable
        onPress={() => setOpen(!open)}
        className="items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: colors.primary,
          transform: [{ rotate: open ? "45deg" : "0deg" }],
        }}
      >
        <MaterialIcons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
};

export default FabButton;
