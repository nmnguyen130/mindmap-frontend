import { View, Text } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

import Header from '@/components/layout/header';
import { useTheme } from '@/components/providers/theme-provider';

const ExploreScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Explore" onMenuPress={handleMenuPress} />
      <View className="flex-1 justify-center items-center p-6">
        <Text
          className="text-2xl font-bold mb-2"
          style={{ color: colors.foreground }}
        >
          Explore Mind Maps
        </Text>
        <Text
          className="text-sm"
          style={{ color: colors.mutedForeground }}
        >
          Public mind maps coming soon...
        </Text>
      </View>
    </View>
  );
}

export default ExploreScreen;
