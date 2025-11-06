import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChildStore {
  currentChildId: string | null;
  setChildId: (id: string | null) => void;
}

const STORAGE_KEY = "current-child-id";

export const useChildStore = create<ChildStore>()(
  persist(
    (set) => ({
      currentChildId: null,
      setChildId: (id) => set({ currentChildId: id }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
