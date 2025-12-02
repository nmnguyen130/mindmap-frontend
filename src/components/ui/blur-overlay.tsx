import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/components/providers/theme-provider';

interface BlurOverlayProps {
    intensity?: number;
}

const BlurOverlay: React.FC<BlurOverlayProps> = ({ intensity = 40 }) => {
    const { theme } = useTheme();

    const backgroundColor = theme === 'dark'
        ? `rgba(0, 0, 0, ${intensity / 100})`
        : `rgba(255, 255, 255, ${intensity / 100})`;

    return (
        <View
            className="flex-1"
            style={[
                StyleSheet.absoluteFill,
                { backgroundColor }
            ]}
        />
    );
};

export default BlurOverlay;
