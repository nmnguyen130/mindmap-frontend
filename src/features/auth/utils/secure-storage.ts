import * as SecureStore from "expo-secure-store";
import { StateStorage } from "zustand/middleware";

// Zustand persist adapter using Expo SecureStore for encrypted storage
export const secureStorage: StateStorage = {
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
};
