import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface User {
  id: string
  email: string
  name?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,

        login: async (credentials) => {
          set({ isLoading: true })
          try {
            // TODO: Implement actual login API call
            const user = { id: '1', email: credentials.email, name: 'User' }
            set({ user, isAuthenticated: true, isLoading: false })
          } catch (error) {
            set({ isLoading: false })
            throw error
          }
        },

        logout: async () => {
          set({ user: null, isAuthenticated: false })
          // TODO: Implement logout API call
        },

        refreshToken: async () => {
          // TODO: Implement token refresh
        },
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
      }
    ),
    { name: 'AuthStore' }
  )
)
