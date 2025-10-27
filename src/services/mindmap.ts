import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { MindMapResponse } from '@/types/api'
import { MindMap } from '@/stores/mindmaps'

// TODO: Replace with actual API calls
const mindmapAPI = {
  getUserMaps: async (): Promise<MindMapResponse[]> => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000))
    return []
  },

  createMap: async (data: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>): Promise<MindMapResponse> => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      id: Date.now().toString(),
      title: data.title,
      nodes: data.nodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}

export const useMindMaps = () => {
  return useQuery({
    queryKey: ['mindmaps'],
    queryFn: mindmapAPI.getUserMaps,
    staleTime: 1000 * 60 * 2 // 2 minutes
  })
}

export const useCreateMindMap = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: mindmapAPI.createMap,
    onSuccess: (newMap) => {
      // Optimistic update
      queryClient.setQueryData(['mindmaps'], (oldMaps: MindMapResponse[] = []) =>
        [...oldMaps, newMap]
      )
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['mindmaps'] })
    }
  })
}
