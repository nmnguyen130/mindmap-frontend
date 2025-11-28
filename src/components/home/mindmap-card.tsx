import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/components/providers/theme-provider';

export interface MindMapCardProps {
    id: string;
    title: string;
    nodeCount: number;
    updatedAt: Date;
    accentColor: string;
    onPress: () => void;
}

const MindMapCard = ({
    title,
    nodeCount,
    updatedAt,
    accentColor,
    onPress,
}: MindMapCardProps) => {
    const { colors, isDark } = useTheme();

    const getRelativeTime = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <Pressable
            onPress={onPress}
            className="mb-3 rounded-xl overflow-hidden mx-1"
            style={{
                backgroundColor: colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.15 : 0.03,
                shadowRadius: 6,
                elevation: 2,
                borderRadius: 12,
            }}
        >
            {/* Accent bar on the left */}
            <View
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: accentColor }}
            />

            <View className="flex-row items-center p-4 pl-5">
                {/* Icon */}
                <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{
                        backgroundColor: `${accentColor}15`, // 15 = ~8% opacity
                    }}
                >
                    <MaterialIcons
                        name="account-tree"
                        size={24}
                        color={accentColor}
                    />
                </View>

                {/* Content */}
                <View className="flex-1 justify-center">
                    <Text
                        className="text-lg font-bold mb-1"
                        style={{ color: colors.foreground }}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>

                    {/* Metadata Row */}
                    <View className="flex-row items-center">
                        <View className="flex-row items-center mr-3">
                            <MaterialIcons
                                name="bubble-chart"
                                size={14}
                                color={colors.mutedForeground}
                                style={{ marginRight: 4 }}
                            />
                            <Text className="text-xs font-medium" style={{ color: colors.mutedForeground }}>
                                {nodeCount}
                            </Text>
                        </View>

                        <View className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />

                        <View className="flex-row items-center">
                            <MaterialIcons
                                name="access-time"
                                size={14}
                                color={colors.mutedForeground}
                                style={{ marginRight: 4 }}
                            />
                            <Text className="text-xs font-medium" style={{ color: colors.mutedForeground }}>
                                {getRelativeTime(updatedAt)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Arrow */}
                <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                >
                    <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={colors.mutedForeground}
                    />
                </View>
            </View>
        </Pressable>
    );
};

export default MindMapCard;
