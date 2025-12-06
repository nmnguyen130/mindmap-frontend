import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Mindmap UI Store - lightweight, no data, just UI state
interface MindmapUIState {
  // Current view
  currentMapId: string | null;

  // Selection
  selectedNodeIds: string[];

  // Edit mode
  isEditing: boolean;
  editingNodeId: string | null;

  // Actions
  setCurrentMap: (id: string | null) => void;
  selectNode: (id: string) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  toggleNodeSelection: (id: string) => void;
  startEditing: (nodeId: string) => void;
  stopEditing: () => void;
  reset: () => void;
}

const initialState = {
  currentMapId: null,
  selectedNodeIds: [],
  isEditing: false,
  editingNodeId: null,
};

export const useMindmapUI = create<MindmapUIState>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentMap: (id) =>
        set({ currentMapId: id, selectedNodeIds: [], isEditing: false }),

      selectNode: (id) => set({ selectedNodeIds: [id] }),

      selectNodes: (ids) => set({ selectedNodeIds: ids }),

      clearSelection: () => set({ selectedNodeIds: [] }),

      toggleNodeSelection: (id) =>
        set((state) => ({
          selectedNodeIds: state.selectedNodeIds.includes(id)
            ? state.selectedNodeIds.filter((nodeId) => nodeId !== id)
            : [...state.selectedNodeIds, id],
        })),

      startEditing: (nodeId) => set({ isEditing: true, editingNodeId: nodeId }),

      stopEditing: () => set({ isEditing: false, editingNodeId: null }),

      reset: () => set(initialState),
    }),
    { name: "MindmapUI" }
  )
);

// Selectors
export const selectCurrentMapId = (state: MindmapUIState) => state.currentMapId;
export const selectSelectedNodeIds = (state: MindmapUIState) =>
  state.selectedNodeIds;
export const selectIsEditing = (state: MindmapUIState) => state.isEditing;
export const selectEditingNodeId = (state: MindmapUIState) =>
  state.editingNodeId;
