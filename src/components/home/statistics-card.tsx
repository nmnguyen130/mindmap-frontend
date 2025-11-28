import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/components/providers/theme-provider';

export interface StatisticsCardProps {
    label: string;
    value: number | string;
    icon: keyof typeof MaterialIcons.glyphMap;
    gradientColors: [string, string];
    trend?: number;
    delay?: number;
}

const StatisticsCard = ({
    label,
    value,
    icon,
    gradientColors,
    trend,
    delay = 0,
}: StatisticsCardProps) => {
    const { colors, isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay, fadeAnim, slideAnim]);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 12,
                elevation: 5,
                borderRadius: 16,
            }}
            className="flex-1 min-w-[100px] mx-1 bg-transparent"
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl px-4 py-2"
                style={{ borderRadius: 16 }}
            >
                <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-2 justify-center">
                        <Text
                            className="text-3xl font-bold mb-0.5 text-white"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {value}
                        </Text>
                        <Text
                            className="text-sm font-medium text-white/90"
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                    </View>

                    <View className="items-end justify-center gap-y-2">
                        <View className="bg-white/20 p-2 rounded-full">
                            <MaterialIcons name={icon} size={22} color="#ffffff" />
                        </View>

                        {trend !== undefined && (
                            <View className="flex-row items-center bg-white/15 px-2 py-1 rounded-lg backdrop-blur-sm">
                                <MaterialIcons
                                    name={trend >= 0 ? 'trending-up' : 'trending-down'}
                                    size={14}
                                    color="rgba(255,255,255,0.9)"
                                />
                                <Text className="text-xs ml-1 font-medium text-white/90">
                                    {trend > 0 ? '+' : ''}
                                    {trend}%
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

export default StatisticsCard;
