import { QueryClient } from '@tanstack/react-query'

export interface HttpError extends Error {
  status: number
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,  // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        const httpError = error as HttpError
        if (httpError?.status >= 400 && httpError?.status < 500) return false
        return failureCount < 3
      }
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Global error handling
        console.error('Mutation error:', error)
      }
    }
  }
})
