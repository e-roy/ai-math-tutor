"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type FontSize = "small" | "medium" | "large";

interface UIPrefsState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const STORAGE_KEY = "ui-prefs";

export const useUIPrefsStore = create<UIPrefsState>()(
  persist(
    (set) => ({
      fontSize: "medium",
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
