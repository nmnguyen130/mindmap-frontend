import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface Modal {
  id: string;
  type: string;
  data?: any;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  modalStack: Modal[];
  notifications: Notification[];
  toggleSidebar: () => void;
  showModal: (modal: Modal) => void;
  hideModal: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      sidebarOpen: false,
      modalStack: [],
      notifications: [],

      toggleSidebar: () => {
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        });
      },

      showModal: (modal) => {
        set((state) => {
          state.modalStack.push(modal);
        });
      },

      hideModal: (id) => {
        set((state) => {
          state.modalStack = state.modalStack.filter((m) => m.id !== id);
        });
      },

      addNotification: (notification) => {
        const id = Date.now().toString();
        set((state) => {
          state.notifications.push({ ...notification, id });
        });
      },

      removeNotification: (id) => {
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id);
        });
      },
    })),
    { name: "UIStore" }
  )
);
