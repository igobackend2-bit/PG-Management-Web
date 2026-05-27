import { create } from 'zustand';
import type { ToastMessage, ToastType } from '../types';

interface UiState {
  sidebarCollapsed: boolean;
  toastQueue: ToastMessage[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  pushToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toastQueue: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  pushToast: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toastQueue: [...state.toastQueue, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({
        toastQueue: state.toastQueue.filter((t) => t.id !== id),
      }));
    }, 3500);
  },

  dismissToast: (id) =>
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    })),
}));
