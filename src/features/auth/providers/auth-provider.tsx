import { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useInitAuth } from "../hooks/use-init-auth";

/**
 * Minimal wrapper for auth loading state.
 * Shows spinner during hydration/validation.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isReady, status } = useInitAuth();

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-sm text-muted-foreground">
          {status === "hydrating" ? "Restoring session..." : "Validating..."}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};
