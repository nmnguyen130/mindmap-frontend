import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth';
import { useTheme } from '@/components/providers/theme-provider';
import { useStatusModal } from '@/components/providers/modal-provider';
import FormScreen from '@/components/ui/form-screen';
import ThemedTextInput from '@/components/ui/text-input';
import ActionButton from '@/components/ui/action-button';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const router = useRouter();
    const { colors } = useTheme();
    const { showStatusModal } = useStatusModal();
    const { forgotPassword } = useAuth();

    const handleSubmit = async () => {
        if (!email.trim()) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Please enter your email address' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Please enter a valid email address' });
            return;
        }

        try {
            await forgotPassword.mutateAsync({ email: email.trim() });
            setSubmitted(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to send reset email';
            showStatusModal({ type: 'error', title: 'Error', message });
        }
    };

    if (submitted) {
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
                                <MaterialIcons name="email" size={40} color={colors.success} />
                            </View>
                            <Text
                                className="text-2xl font-bold mb-2 text-center"
                                style={{ color: colors.foreground }}
                            >
                                Check Your Email
                            </Text>
                            <Text
                                className="text-base text-center px-4"
                                style={{ color: colors.mutedForeground }}
                            >
                                If an account exists with this email, you will receive password reset instructions.
                            </Text>
                        </View>

                        {/* Back to Login Button */}
                        <ActionButton
                            title="Back to Login"
                            variant="primary"
                            onPress={() => router.back()}
                        />
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
                    <View className="mb-12">
                        <Text
                            className="text-4xl font-bold mb-2"
                            style={{ color: colors.foreground }}
                        >
                            Forgot Password?
                        </Text>
                        <Text
                            className="text-base"
                            style={{ color: colors.mutedForeground }}
                        >
                            Enter your email and we'll send you instructions to reset your password
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="mb-6">
                        <ThemedTextInput
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="email"
                            editable={!forgotPassword.isPending}
                        />
                    </View>

                    {/* Submit Button */}
                    <ActionButton
                        title={forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
                        variant="primary"
                        onPress={handleSubmit}
                        disabled={forgotPassword.isPending}
                    />

                    {/* Back to Login Link */}
                    <View className="flex-row justify-center items-center mt-8">
                        <Text style={{ color: colors.mutedForeground }}>
                            Remember your password?{' '}
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text
                                className="font-semibold"
                                style={{ color: colors.primary }}
                            >
                                Sign In
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </FormScreen>
        </View>
    );
};

export default ForgotPasswordScreen;
