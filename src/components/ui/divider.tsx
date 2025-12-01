import { View, Text } from 'react-native';
import { useTheme } from '@/components/providers/theme-provider';

interface DividerProps {
    text?: string;
}

const Divider = ({ text = 'OR' }: DividerProps) => {
    const { colors } = useTheme();

    return (
        <View className="flex-row items-center my-6">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            {text && (
                <Text
                    className="mx-4 text-xs font-medium"
                    style={{ color: colors.mutedForeground }}
                >
                    {text}
                </Text>
            )}
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
        </View>
    );
};

export default Divider;
