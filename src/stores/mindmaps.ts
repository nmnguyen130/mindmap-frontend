import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface MindMap {
  id: string
  title: string
  nodes: MindMapNode[]
  createdAt: Date
  updatedAt: Date
}

export interface MindMapNode {
  id: string
  text: string
  position: { x: number; y: number }
  connections: string[]
}

interface MindMapState {
  maps: MindMap[]
  currentMap: MindMap | null
  isLoading: boolean
  error: string | null
  loadMaps: () => Promise<void>
  createMap: (data: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MindMap>
  updateMap: (id: string, updates: Partial<MindMap>) => Promise<void>
  deleteMap: (id: string) => Promise<void>
  setCurrentMap: (map: MindMap | null) => void
}

export const useMindMapStore = create<MindMapState>()(
  devtools(
    persist(
      immer((set, get) => ({
        maps: [],
        currentMap: null,
        isLoading: false,
        error: null,

        loadMaps: async () => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement API call to load maps
            const maps: MindMap[] = []
            set({ maps, isLoading: false })
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },

        createMap: async (data) => {
          const newMap: MindMap = {
            ...data,
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          set((state) => {
            state.maps.push(newMap)
          })
          return newMap
        },

        updateMap: async (id, updates) => {
          set((state) => {
            const index = state.maps.findIndex(m => m.id === id)
            if (index !== -1) {
              state.maps[index] = { ...state.maps[index], ...updates, updatedAt: new Date() }
            }
          })
        },

        deleteMap: async (id) => {
          set((state) => {
            state.maps = state.maps.filter(m => m.id !== id)
          })
        },

        setCurrentMap: (map) => {
          set({ currentMap: map })
        },
      })),
      {
        name: 'mindmap-storage',
        partialize: (state) => ({ currentMap: state.currentMap })
      }
    ),
    { name: 'MindMapStore' }
  )
)
