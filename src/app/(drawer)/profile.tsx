import { View, Text, Pressable } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

import Header from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/components/providers/theme-provider';

const ProfileScreen = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
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
              Welcome, {user.name || user.email}
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
