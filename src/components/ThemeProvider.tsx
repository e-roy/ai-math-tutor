"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { useUIPrefsStore } from "@/store/useUIPrefsStore";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const fontSize = useUIPrefsStore((state) => state.fontSize);

  useEffect(() => {
    // Apply font size to document root
    const root = document.documentElement;
    root.classList.remove(
      "font-size-small",
      "font-size-medium",
      "font-size-large",
    );
    root.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

