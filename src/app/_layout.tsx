import "../global.css";

import { Stack } from "expo-router";

import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { ModalProvider } from "@/components/providers/modal-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/features/auth";
import { AuthenticatedSyncWrapper } from "@/features/sync";
import { queryClient } from "@/shared/api/client";
import { getDB } from "@/shared/database";

// Initialize database
getDB().catch(console.error);

const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthenticatedSyncWrapper>
              <ThemeProvider>
                <ModalProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(drawer)" />
                    <Stack.Screen name="(auth)" />
                  </Stack>
                </ModalProvider>
              </ThemeProvider>
            </AuthenticatedSyncWrapper>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
