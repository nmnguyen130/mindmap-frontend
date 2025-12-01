import { View, Text, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useResetPassword } from '@/features/auth/hooks/use-auth';
import { useTheme } from '@/components/providers/theme-provider';
import FormScreen from '@/components/ui/form-screen';
import ThemedTextInput from '@/components/ui/text-input';
import ActionButton from '@/components/ui/action-button';

const ResetPasswordScreen = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { colors } = useTheme();
    const resetPassword = useResetPassword();
    const params = useLocalSearchParams<{ token?: string }>();

    // In a real app, the token would come from the email link
    const resetToken = params.token || 'demo-token';

    const getPasswordStrength = () => {
        if (password.length === 0) return null;
        if (password.length >= 12) return { text: 'Strong', color: colors.success, bars: 3 };
        if (password.length >= 8) return { text: 'Good', color: colors.warning, bars: 2 };
        return { text: 'Weak', color: colors.error, bars: 1 };
    };

    const strength = getPasswordStrength();

    const handleSubmit = async () => {
        if (!password.trim() || !confirmPassword.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        try {
            await resetPassword.mutateAsync({ token: resetToken, password });
            setSuccess(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.replace('/login' as any);
            }, 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reset password';
            Alert.alert('Error', message);
        }
    };

    if (success) {
        return (
            <View className="flex-1" style={{ backgroundColor: colors.background }}>
                <FormScreen>
                    <View className="flex-1 justify-center">
                        {/* Success Icon */}
                        <View className="items-center mb-8">
                            <View
                                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: colors.success + '20' }}
                            >
                                <MaterialIcons name="check-circle" size={40} color={colors.success} />
                            </View>
                            <Text
                                className="text-2xl font-bold mb-2 text-center"
                                style={{ color: colors.foreground }}
                            >
                                Password Reset!
                            </Text>
                            <Text
                                className="text-base text-center px-4"
                                style={{ color: colors.mutedForeground }}
                            >
                                Your password has been reset successfully. Redirecting to login...
                            </Text>
                        </View>
                    </View>
                </FormScreen>
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <FormScreen>
                <View className="flex-1 justify-center">
                    {/* Back Button */}
                    <Pressable
                        onPress={() => router.back()}
                        className="absolute top-12 left-0 p-2 flex-row items-center"
                    >
                        <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
                    </Pressable>

                    {/* Header */}
                    <View className="mb-10">
                        <Text
                            className="text-4xl font-bold mb-2"
                            style={{ color: colors.foreground }}
                        >
                            Reset Password
                        </Text>
                        <Text
                            className="text-base"
                            style={{ color: colors.mutedForeground }}
                        >
                            Choose a new password for your account
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="mb-6">
                        <ThemedTextInput
                            label="New Password"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password-new"
                            leftIcon="lock"
                            editable={!resetPassword.isPending}
                        />

                        <ThemedTextInput
                            label="Confirm Password"
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password-new"
                            leftIcon="lock"
                            editable={!resetPassword.isPending}
                            error={
                                confirmPassword && password !== confirmPassword
                                    ? 'Passwords do not match'
                                    : undefined
                            }
                        />
                    </View>

                    {/* Password Strength */}
                    {strength && (
                        <View className="mb-6">
                            <View className="flex-row gap-1 mb-1">
                                {[1, 2, 3].map((bar) => (
                                    <View
                                        key={bar}
                                        className="h-1 flex-1 rounded-full"
                                        style={{
                                            backgroundColor: bar <= strength.bars ? strength.color : colors.border,
                                        }}
                                    />
                                ))}
                            </View>
                            <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                                Password strength: {strength.text}
                            </Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <ActionButton
                        title={resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
                        variant="primary"
                        onPress={handleSubmit}
                        disabled={resetPassword.isPending}
                    />
                </View>
            </FormScreen>
        </View>
    );
};

export default ResetPasswordScreen;
