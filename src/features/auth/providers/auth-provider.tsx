import { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuthStore } from "../store/auth-store";

/**
 * Auth provider that waits for Zustand hydration.
 * Shows spinner until tokens are loaded from SecureStore.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (isReady) return;
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setIsReady(true)
    );
    return unsub;
  }, [isReady]);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <>{children}</>;
};
