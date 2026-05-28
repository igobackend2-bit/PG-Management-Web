import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '../types';

interface BranchState {
  branches: Branch[];
  selectedBranch: Branch | null;
  isLoading: boolean;
  setBranches: (branches: Branch[]) => void;
  setSelectedBranch: (branch: Branch) => void;
  setLoading: (loading: boolean) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branches: [],
      selectedBranch: null,
      isLoading: false,
      setBranches: (branches) =>
        set((state) => {
          // Validate that the persisted selectedBranch still exists in the new list.
          // If a branch was deleted or the user switched accounts, fall back to first.
          const stillExists = state.selectedBranch
            ? branches.some((b) => b.id === state.selectedBranch!.id)
            : false;
          return {
            branches,
            selectedBranch: stillExists
              ? state.selectedBranch
              : (branches[0] ?? null),
          };
        }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'pg-branch',
      partialize: (state) => ({ selectedBranch: state.selectedBranch }),
    }
  )
);
