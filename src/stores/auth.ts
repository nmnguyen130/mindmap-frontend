import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          // TODO: Implement actual authentication with SQLite/backend
          // For now, simulate login
          const mockUser: User = {
            id: "1",
            email,
            name: email.split("@")[0],
          };

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message, isLoading: false });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          // TODO: Implement actual registration with SQLite/backend
          // For now, simulate registration
          const mockUser: User = {
            id: Date.now().toString(),
            email,
            name,
          };

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ error: message, isLoading: false });
        }
      },

      updateUser: (updates: Partial<User>) => {
        set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...updates };
          }
        });
      },

      clearError: () => {
        set({ error: null });
      },
    })),
    { name: "AuthStore" }
  )
);
