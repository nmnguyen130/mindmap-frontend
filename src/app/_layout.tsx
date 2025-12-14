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
import { queryClient } from "@/lib/query-client";

// DB initializes lazily on first query (ThemeProvider loads settings)

const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <AuthenticatedSyncWrapper>
                <ModalProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(drawer)" />
                    <Stack.Screen name="(auth)" />
                  </Stack>
                </ModalProvider>
              </AuthenticatedSyncWrapper>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
