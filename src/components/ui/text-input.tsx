import React, { useState } from "react";
import { TextInput, TextInputProps, View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/components/providers/theme-provider";

export interface ThemedTextInputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof MaterialIcons.glyphMap;
    rightIcon?: keyof typeof MaterialIcons.glyphMap;
    onRightIconPress?: () => void;
}

const ThemedTextInput = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    secureTextEntry,
    ...props
}: ThemedTextInputProps) => {
    const { colors } = useTheme();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = secureTextEntry;
    const showPasswordToggle = isPassword && !rightIcon;
    const actualSecureTextEntry = isPassword && !isPasswordVisible;

    const borderColor = error
        ? colors.error
        : isFocused
            ? colors.primary
            : colors.border;

    return (
        <View className="mb-4">
            {label && (
                <Text
                    className="text-sm font-medium mb-2"
                    style={{ color: colors.foreground }}
                >
                    {label}
                </Text>
            )}

            <View
                className="flex-row items-center rounded-xl px-4"
                style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor,
                    minHeight: 52,
                }}
            >
                {leftIcon && (
                    <MaterialIcons
                        name={leftIcon}
                        size={20}
                        color={colors.mutedForeground}
                        style={{ marginRight: 12 }}
                    />
                )}

                <TextInput
                    {...props}
                    secureTextEntry={actualSecureTextEntry}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    className="flex-1 text-base"
                    style={{ color: colors.foreground }}
                    placeholderTextColor={colors.mutedForeground}
                />

                {showPasswordToggle && (
                    <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                        <MaterialIcons
                            name={isPasswordVisible ? "visibility-off" : "visibility"}
                            size={20}
                            color={colors.mutedForeground}
                        />
                    </Pressable>
                )}

                {rightIcon && (
                    <Pressable onPress={onRightIconPress}>
                        <MaterialIcons
                            name={rightIcon}
                            size={20}
                            color={colors.mutedForeground}
                        />
                    </Pressable>
                )}
            </View>

            {error && (
                <Text className="text-xs mt-1.5 ml-1" style={{ color: colors.error }}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default ThemedTextInput;
