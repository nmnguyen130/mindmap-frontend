import { View, Text, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useLogin } from '@/hooks/use-auth';
import { useTheme } from '@/components/providers/theme-provider';
import FormScreen from '@/components/ui/form-screen';
import ThemedTextInput from '@/components/ui/text-input';
import ActionButton from '@/components/ui/action-button';

const LoginScreen = () => {
  const [email, setEmail] = useState('workflow@example.com');
  const [password, setPassword] = useState('Workflow123!');
  const router = useRouter();
  const { colors } = useTheme();
  const login = useLogin();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login.mutateAsync({ email: email.trim(), password });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Failed', message);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FormScreen>
        <View className="flex-1 justify-center">
          {/* Header */}
          <View className="mb-12">
            <Text
              className="text-4xl font-bold mb-2"
              style={{ color: colors.foreground }}
            >
              Welcome Back
            </Text>
            <Text
              className="text-base"
              style={{ color: colors.mutedForeground }}
            >
              Sign in to your account
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
              editable={!login.isPending}
            />

            <ThemedTextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              leftIcon="lock"
              editable={!login.isPending}
            />
          </View>

          {/* Login Button */}
          <ActionButton
            title={login.isPending ? 'Signing in...' : 'Sign In'}
            variant="primary"
            onPress={handleLogin}
            disabled={login.isPending}
          />

          {/* Register Link */}
          <View className="flex-row justify-center items-center mt-8">
            <Text style={{ color: colors.mutedForeground }}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/register' as any)}>
              <Text
                className="font-semibold"
                style={{ color: colors.primary }}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>
        </View>
      </FormScreen>
    </View>
  );
};

export default LoginScreen;
