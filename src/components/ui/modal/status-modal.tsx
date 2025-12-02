import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/components/providers/theme-provider';
import Modal from './modal';

export type StatusType = 'success' | 'error' | 'warning' | 'info';

export interface StatusButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'primary' | 'destructive';
}

export interface StatusModalProps {
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
    buttons?: StatusButton[];
    onDismiss?: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({
    visible,
    type,
    title,
    message,
    buttons = [{ text: 'OK', style: 'default' }],
    onDismiss,
}) => {
    const { colors } = useTheme();

    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return { name: 'check-circle' as const, color: colors.success };
            case 'error':
                return { name: 'error' as const, color: colors.error };
            case 'warning':
                return { name: 'warning' as const, color: colors.warning };
            case 'info':
                return { name: 'info' as const, color: colors.primary };
        }
    };

    const iconConfig = getIconConfig();

    const handleButtonPress = (button: StatusButton) => {
        button.onPress?.();
        onDismiss?.();
    };

    const getButtonStyle = (buttonStyle: StatusButton['style']) => {
        switch (buttonStyle) {
            case 'primary':
                return {
                    backgroundColor: colors.primary,
                    color: colors.background,
                };
            case 'destructive':
                return {
                    backgroundColor: colors.error,
                    color: '#FFFFFF',
                };
            default:
                return {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                };
        }
    };

    return (
        <Modal
            visible={visible}
            onClose={onDismiss}
            size="md"
            showCloseButton={false}
        >
            <View className="p-8 items-center">
                {/* Icon */}
                <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-5"
                    style={{ backgroundColor: iconConfig.color + '15' }}
                >
                    <MaterialIcons
                        name={iconConfig.name}
                        size={48}
                        color={iconConfig.color}
                    />
                </View>

                {/* Title */}
                <Text
                    className="text-2xl font-bold text-center mb-3"
                    style={{ color: colors.foreground }}
                >
                    {title}
                </Text>

                {/* Message */}
                <Text
                    className="text-base text-center mb-7"
                    style={{ color: colors.mutedForeground, lineHeight: 24 }}
                >
                    {message}
                </Text>

                {/* Buttons */}
                <View className="w-full gap-3">
                    {buttons.map((button, index) => {
                        const buttonStyles = getButtonStyle(button.style);
                        return (
                            <Pressable
                                key={index}
                                className={`py-4 px-6 rounded-xl items-center justify-center active:opacity-70 ${buttons.length > 1 ? 'flex-1' : ''
                                    }`}
                                style={{ backgroundColor: buttonStyles.backgroundColor }}
                                onPress={() => handleButtonPress(button)}
                            >
                                <Text
                                    className="text-base font-semibold"
                                    style={{ color: buttonStyles.color }}
                                >
                                    {button.text}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
};

export default StatusModal;
