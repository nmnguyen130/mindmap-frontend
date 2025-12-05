import { View, Text, Pressable } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

import Header from '@/components/layout/header';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/components/providers/theme-provider';

const ProfileScreen = () => {
  // Use proper selectors for Zustand - avoid anti-pattern
  const { user, isAuthenticated, logout } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleLogout = () => {
    logout();
  };

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Profile" onMenuPress={handleMenuPress} />
      <View className="flex-1 justify-center items-center p-4">
        <Text
          className="text-2xl font-bold mb-6"
          style={{ color: colors.foreground }}
        >
          Profile
        </Text>

        {isAuthenticated && user ? (
          <>
            <Text
              className="text-lg mb-2"
              style={{ color: colors.foreground }}
            >
              Welcome, {user.email.split('@')[0]}
            </Text>
            <Text
              className="mb-6"
              style={{ color: colors.mutedForeground }}
            >
              {user.email}
            </Text>
            <Pressable
              className="w-full p-3 rounded-lg"
              style={{ backgroundColor: colors.error }}
              onPress={handleLogout}
            >
              <Text
                className="text-white text-center font-semibold"
              >
                Logout
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: colors.mutedForeground }}>Not logged in</Text>
        )}
      </View>
    </View>
  );
}

export default ProfileScreen;
