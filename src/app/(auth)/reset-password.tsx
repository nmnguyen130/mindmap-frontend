import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reset Password Screen
 * 
 * This screen is accessed via deep link from password reset email.
 * URL format: mindflow://reset-password#access_token=xxx
 * or: mindflow://reset-password?token=xxx
 */
export default function ResetPasswordScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { resetPassword } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Extract access token from URL params or hash
    const accessToken = (params.token || params.access_token) as string;

    const handleResetPassword = async () => {
        if (!accessToken) {
            Alert.alert('Error', 'Invalid or expired reset link');
            router.replace('/(auth)/forgot-password');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        try {
            await resetPassword.mutateAsync({ accessToken, password });
            Alert.alert(
                'Success',
                'Your password has been reset successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(auth)/login'),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to reset password'
            );
        }
    };

    return (
        <View className="flex-1 bg-background px-6 justify-center">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-foreground mb-2">Reset Password</Text>
                <Text className="text-muted-foreground">
                    Enter your new password below
                </Text>
            </View>

            {/* New Password Input */}
            <View className="mb-4">
                <Text className="text-foreground mb-2 font-medium">New Password</Text>
                <View className="flex-row items-center border border-border rounded-lg px-4 bg-card">
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-3 px-3 text-foreground"
                        placeholder="Enter new password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#9CA3AF"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Confirm Password Input */}
            <View className="mb-6">
                <Text className="text-foreground mb-2 font-medium">Confirm Password</Text>
                <View className="flex-row items-center border border-border rounded-lg px-4 bg-card">
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-3 px-3 text-foreground"
                        placeholder="Confirm new password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Ionicons
                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#9CA3AF"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
                className="bg-primary rounded-lg py-4 items-center mb-4"
                onPress={handleResetPassword}
                disabled={resetPassword.isPending}
            >
                {resetPassword.isPending ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-primary-foreground font-semibold text-lg">
                        Reset Password
                    </Text>
                )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
                className="items-center"
                onPress={() => router.replace('/(auth)/login')}
            >
                <Text className="text-primary font-medium">Back to Login</Text>
            </TouchableOpacity>
        </View>
    );
}
