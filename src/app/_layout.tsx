import "../global.css";

import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

import { Stack } from "expo-router";

import NetInfo from "@react-native-community/netinfo";
import { QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { ModalProvider } from "@/components/providers/modal-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/features/auth";
import { queryClient } from "@/shared/api/client";
import { databaseService } from "@/shared/database/sqlite-client";

// Initialize database
databaseService.initialize().catch(console.error);

// Online status management
const useOnlineManager = () => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);
};

// App focus management
const useAppState = (handler: (status: AppStateStatus) => void) => {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handler);
    return () => subscription.remove();
  }, [handler]);
};

const onAppStateChange = (status: AppStateStatus) => {
  focusManager.setFocused(status === "active");
};

const RootLayout = () => {
  useOnlineManager();
  useAppState(onAppStateChange);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <ModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(drawer)" />
                  <Stack.Screen name="(auth)" />
                </Stack>
              </ModalProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
