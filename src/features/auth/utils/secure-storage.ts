import * as SecureStore from "expo-secure-store";
import { StateStorage } from "zustand/middleware";

// Zustand persist adapter using Expo SecureStore for encrypted storage
export const secureStorage: StateStorage = {
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
};

// Save access and refresh tokens securely
export const saveTokens = async (accessToken: string, refreshToken: string) => {
  await Promise.all([
    SecureStore.setItemAsync("access_token", accessToken),
    SecureStore.setItemAsync("refresh_token", refreshToken),
  ]);
};

// Remove all tokens from secure storage
export const clearTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync("access_token"),
    SecureStore.deleteItemAsync("refresh_token"),
  ]);
};
