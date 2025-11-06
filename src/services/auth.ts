import { useMutation } from '@tanstack/react-query'

import { LoginRequest, LoginResponse } from '@/types/api'

// TODO: Replace with actual API calls
const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      user: { id: '1', email: credentials.email, name: 'User' },
      token: 'mock-token'
    }
  },

  logout: async (): Promise<void> => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

export function useLogin() {
  return useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      // Store token, update auth store
      console.log('Login successful:', data)
    }
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      console.log('Logout successful')
    }
  })
}
