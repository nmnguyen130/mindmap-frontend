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
import SocialButton from '@/components/ui/social-button';
import Divider from '@/components/ui/divider';

const RegisterScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();
    const { colors } = useTheme();
    const { showStatusModal } = useStatusModal();
    const { register } = useAuth();

    const validateForm = () => {
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Please enter a valid email address' });
            return false;
        }

        if (password.length < 8) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Password must be at least 8 characters long' });
            return false;
        }

        if (password !== confirmPassword) {
            showStatusModal({ type: 'error', title: 'Error', message: 'Passwords do not match' });
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        try {
            await register.mutateAsync({ email: email.trim(), password });
            showStatusModal({
                type: 'success',
                title: 'Success',
                message: 'Account created successfully! Please login.',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => router.replace('/login' as any) }],
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            showStatusModal({ type: 'error', title: 'Registration Failed', message });
        }
    };

    const handleGoogleSignIn = () => {
        showStatusModal({
            type: 'info',
            title: 'Coming Soon!',
            message: 'Google Sign-In will be available once the backend integration is complete. Please use email/password for now.',
        });
    };

    const getPasswordStrength = () => {
        if (password.length === 0) return null;
        if (password.length >= 12) return { text: 'Strong', color: colors.success, bars: 3 };
        if (password.length >= 8) return { text: 'Good', color: colors.warning, bars: 2 };
        return { text: 'Weak', color: colors.error, bars: 1 };
    };

    const strength = getPasswordStrength();

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <FormScreen>
                <View className="flex-1 justify-center">
                    {/* Back Button */}
                    <Pressable
                        onPress={() => router.back()}
                        className="absolute top-12 left-0 p-2 flex-row items-center"
                    >
                        <MaterialIcons
                            name="arrow-back"
                            size={24}
                            color={colors.foreground}
                        />
                    </Pressable>

                    {/* Header */}
                    <View className="mb-8">
                        <Text
                            className="text-4xl font-bold mb-2"
                            style={{ color: colors.foreground }}
                        >
                            Create Account
                        </Text>
                        <Text
                            className="text-base"
                            style={{ color: colors.mutedForeground }}
                        >
                            Start organizing your ideas with mind maps
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="mb-4">
                        <ThemedTextInput
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="email"
                            editable={!register.isPending}
                        />

                        <ThemedTextInput
                            label="Password"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password-new"
                            leftIcon="lock"
                            editable={!register.isPending}
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
                            editable={!register.isPending}
                            error={
                                confirmPassword && password !== confirmPassword
                                    ? 'Passwords do not match'
                                    : undefined
                            }
                        />
                    </View>

                    {/* Password Strength */}
                    {strength && (
                        <View className="mb-4">
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

                    {/* Register Button */}
                    <ActionButton
                        title={register.isPending ? 'Creating Account...' : 'Sign Up'}
                        variant="primary"
                        onPress={handleRegister}
                        disabled={register.isPending}
                    />

                    {/* Login Link */}
                    <View className="flex-row justify-center items-center mt-6">
                        <Text style={{ color: colors.mutedForeground }}>
                            Already have an account?{' '}
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

                    <Divider />

                    {/* Google Sign-In */}
                    <View className="mb-3">
                        <SocialButton
                            provider="google"
                            onPress={handleGoogleSignIn}
                            disabled={register.isPending}
                        />
                    </View>

                    {/* Facebook Sign-In */}
                    <View>
                        <SocialButton
                            provider="facebook"
                            onPress={handleGoogleSignIn}
                            disabled={register.isPending}
                        />
                    </View>
                </View>
            </FormScreen>
        </View>
    );
};

export default RegisterScreen;
