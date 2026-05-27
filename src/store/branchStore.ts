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
        set((state) => ({
          branches,
          selectedBranch: state.selectedBranch ?? branches[0] ?? null,
        })),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'pg-branch',
      partialize: (state) => ({ selectedBranch: state.selectedBranch }),
    }
  )
);
