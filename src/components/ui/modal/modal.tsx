import React from 'react';
import { View, Text, Pressable, Modal as RNModal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/components/providers/theme-provider';
import BlurOverlay from '../blur-overlay';

export interface ModalProps {
    visible: boolean;
    onClose?: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'full';
    showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
    visible,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
}) => {
    const { colors } = useTheme();

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'w-[85%] max-w-[350px]';
            case 'md':
                return 'w-[85%] max-w-[400px]';
            case 'lg':
                return 'w-[90%] max-w-[500px]';
            case 'full':
                return 'w-full h-full';
        }
    };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Container for overlay and modal */}
            <View className="flex-1 justify-center items-center">
                {/* Blur Overlay - positioned absolutely behind modal */}
                <View className="absolute inset-0">
                    <BlurOverlay intensity={60} />
                    <Pressable className="flex-1" onPress={onClose} />
                </View>

                {/* Modal Content */}
                <View
                    className={`${getSizeClasses()} ${size === 'full' ? '' : 'rounded-3xl'
                        } border overflow-hidden`}
                    style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                    }}
                >
                    {/* Header */}
                    {(title || showCloseButton) && (
                        <View
                            className="flex-row justify-between items-center px-6 py-4 border-b"
                            style={{ borderColor: colors.border }}
                        >
                            {title ? (
                                <Text
                                    className="text-xl font-bold flex-1"
                                    style={{ color: colors.foreground }}
                                >
                                    {title}
                                </Text>
                            ) : (
                                <View className="flex-1" />
                            )}
                            {showCloseButton && onClose && (
                                <Pressable
                                    onPress={onClose}
                                    className="ml-2 w-8 h-8 rounded-full items-center justify-center active:opacity-70"
                                    style={{ backgroundColor: colors.muted + '40' }}
                                >
                                    <MaterialIcons
                                        name="close"
                                        size={20}
                                        color={colors.foreground}
                                    />
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Content */}
                    <View className={size === 'full' ? 'flex-1' : ''}>
                        {children}
                    </View>
                </View>
            </View>
        </RNModal>
    );
};

export default Modal;
