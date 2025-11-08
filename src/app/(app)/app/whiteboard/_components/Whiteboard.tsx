"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type React from "react";

// Import Excalidraw CSS - required for proper styling
// Excalidraw v0.18 requires CSS to be imported
import "@excalidraw/excalidraw/index.css";

import { api } from "@/trpc/react";
import { dbFormatToScene } from "@/lib/whiteboard/scene-adapters";
import type { ExcalidrawScene } from "@/types/board";

// Type definitions for Excalidraw API
// Using more permissive types since Excalidraw doesn't export all types directly
type ExcalidrawImperativeAPI = {
  updateScene: (sceneData: {
    elements?: readonly unknown[];
    appState?: Partial<Record<string, unknown>> | null;
    files?: Record<string, unknown> | null;
    captureUpdate?: "NEVER" | "IMMEDIATELY" | "EVENTUALLY";
  }) => void;
  [key: string]: unknown;
};

type OrderedExcalidrawElement = unknown;

interface WhiteboardProps {
  conversationId: string;
  className?: string;
}

/**
 * Whiteboard component using Excalidraw
 * Supports autosave with throttling and exposes API for AI annotations
 */
export function Whiteboard({ conversationId, className }: WhiteboardProps) {
  // Use ref for Excalidraw API instead of state
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use ref to track version so throttled save always uses latest value
  const versionRef = useRef(1);
  const isSavingRef = useRef(false);
  const pendingSceneRef = useRef<ExcalidrawScene | null>(null);
  const lastSavedElementsRef = useRef<readonly unknown[]>([]);
  const isInitializedRef = useRef(false);
  const conversationIdRef = useRef(conversationId);

  // Store utils in ref to avoid dependency issues
  // Call hook once and store in ref
  const utils = api.useUtils();
  const utilsRef = useRef(utils);
  utilsRef.current = utils;

  // Load initial board state
  const { data: boardData, isLoading: isLoadingBoard } = api.board.get.useQuery(
    { conversationId },
    { enabled: !!conversationId },
  );

  // Save mutation - tRPC mutations are stable, so we can use it directly
  const saveMutation = api.board.save.useMutation({
    onError: (error) => {
      // Only log non-version-mismatch errors to reduce noise
      // Version mismatches are handled gracefully with retry
      if (
        !(error instanceof Error) ||
        !error.message.includes("Version mismatch")
      ) {
        console.error("Failed to save board:", error);
        // TODO: Show toast notification
      }
    },
  });

  // Initialize scene from database and update version
  useEffect(() => {
    // Clear timeout when conversationId changes
    if (conversationIdRef.current !== conversationId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      conversationIdRef.current = conversationId;
      isInitializedRef.current = false;
      versionRef.current = 1;
      lastSavedElementsRef.current = [];
      pendingSceneRef.current = null;
      isSavingRef.current = false;
    }

    if (boardData && !isLoadingBoard) {
      // Convert null to undefined for type safety
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rawVersion = boardData.version;
      const version: number | undefined =
        rawVersion === null || rawVersion === undefined
          ? undefined
          : typeof rawVersion === "number"
            ? rawVersion
            : undefined;
      if (typeof version === "number" && version > 0) {
        versionRef.current = version;
      }
      isInitializedRef.current = true;
      setIsLoading(false);
    } else if (!isLoadingBoard && !boardData) {
      // No board exists yet, start with empty scene
      versionRef.current = 1;
      isInitializedRef.current = true;
      setIsLoading(false);
    }
  }, [boardData, isLoadingBoard, conversationId]);

  // Helper function to perform actual save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const performSave = useCallback((scene: ExcalidrawScene) => {
    // Guard: don't save until initialized
    if (!isInitializedRef.current) {
      pendingSceneRef.current = scene;
      return;
    }

    // Double-check we're not already saving (race condition protection)
    if (isSavingRef.current) {
      // Already saving, just update pending scene
      pendingSceneRef.current = scene;
      return;
    }

    // Cancel any pending timeout since we're saving now
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Set saving flag immediately to prevent concurrent saves
    isSavingRef.current = true;
    // Always get the latest version right before saving (read from ref at execution time)
    const versionToSave = versionRef.current;

    saveMutation.mutate(
      {
        conversationId: conversationIdRef.current,
        scene,
        version: versionToSave,
      },
      {
        onSuccess: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const rawVersion = result.version;
          const version: number | undefined =
            rawVersion === null || rawVersion === undefined
              ? undefined
              : typeof rawVersion === "number"
                ? rawVersion
                : undefined;
          if (typeof version === "number" && version > 0) {
            versionRef.current = version;
          }
          lastSavedElementsRef.current = scene.elements;
          isSavingRef.current = false;

          // If there's a new pending scene, save it with updated version
          if (pendingSceneRef.current) {
            const nextScene = pendingSceneRef.current;
            pendingSceneRef.current = null;
            // Small delay to avoid rapid saves
            setTimeout(() => {
              performSave(nextScene);
            }, 100);
          }
        },
        onError: (error) => {
          // On version mismatch, refetch to get latest version
          if (
            error instanceof Error &&
            error.message.includes("Version mismatch")
          ) {
            // Store scene for retry (keep the latest scene)
            pendingSceneRef.current ??= scene;
            // Don't set isSavingRef to false yet - wait for refetch to complete
            // Refetch will trigger useEffect which will update version
            void utilsRef.current.board.get.refetch({
              conversationId: conversationIdRef.current,
            });
          } else {
            isSavingRef.current = false;
            // For other errors, clear pending scene
            pendingSceneRef.current = null;
          }
        },
      },
    );
  }, []);

  // Throttled save function (500ms delay)
  const throttledSave = useMemo(
    () => (scene: ExcalidrawScene) => {
      // Always update pending scene to latest
      pendingSceneRef.current = scene;

      // If already saving, don't queue another - the pending scene will be saved after current save completes
      if (isSavingRef.current) {
        return;
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Queue save after delay
      saveTimeoutRef.current = setTimeout(() => {
        // Triple-check: scene exists, not already saving
        if (!pendingSceneRef.current || isSavingRef.current) {
          return;
        }

        // Get the scene at execution time
        const sceneToSave = pendingSceneRef.current;

        // Clear pending scene before saving to prevent re-queueing
        pendingSceneRef.current = null;

        // Perform the save (will read latest version from ref)
        performSave(sceneToSave);
      }, 500);
    },
    [performSave],
  );

  // Helper to check if elements actually changed
  const elementsChanged = useCallback(
    (elements: readonly OrderedExcalidrawElement[]): boolean => {
      const lastSaved = lastSavedElementsRef.current;
      if (lastSaved.length !== elements.length) {
        return true;
      }
      // Compare element IDs if available (elements may have id property)
      for (let i = 0; i < elements.length; i++) {
        const current = elements[i] as Record<string, unknown> | undefined;
        const saved = lastSaved[i] as Record<string, unknown> | undefined;
        if (
          current?.id !== saved?.id ||
          JSON.stringify(current) !== JSON.stringify(saved)
        ) {
          return true;
        }
      }
      return false;
    },
    [],
  );

  // Handle Excalidraw changes - only save when elements actually change
  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: unknown,
      files: unknown,
    ) => {
      // Only save if elements actually changed (not just appState like zoom/pan)
      if (!elementsChanged(elements)) {
        return;
      }

      const scene: ExcalidrawScene = {
        elements: Array.from(elements) as readonly unknown[],
        appState: appState as Partial<Record<string, unknown>>,
        files: files as Record<string, unknown>,
      };

      throttledSave(scene);
    },
    [throttledSave, elementsChanged],
  );

  // Handle Excalidraw API callback
  const handleExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI | null) => {
      excalidrawRef.current = api;
      // Expose API via window for AI annotations
      if (typeof window !== "undefined") {
        (
          window as unknown as {
            excalidrawAPI?: ExcalidrawImperativeAPI | null;
          }
        ).excalidrawAPI = api;
      }
    },
    [],
  );

  // Cleanup timeout on unmount and conversationId change
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [conversationId]);

  // Memoize initialData to prevent unnecessary recalculations
  const initialData = useMemo(() => {
    if (!boardData?.scene) {
      return null;
    }
    return dbFormatToScene(boardData.scene) as unknown;
  }, [boardData?.scene]);

  // Debug: Log when component should render
  // IMPORTANT: This must be before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (!isLoading && !isLoadingBoard) {
      console.log("Whiteboard rendering:", {
        conversationId,
        hasInitialData: !!initialData,
        isLoading,
        isLoadingBoard,
      });
    }
  }, [conversationId, initialData, isLoading, isLoadingBoard]);

  if (isLoading || isLoadingBoard) {
    return (
      <div
        className={`flex h-[70vh] items-center justify-center rounded-xl border ${className ?? ""}`}
      >
        <p className="text-muted-foreground">Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div
      className={`h-[70vh] w-full rounded-xl border ${className ?? ""}`}
      style={{
        // Isolate Excalidraw from parent font-size inheritance
        fontSize: "16px",
        // Ensure proper container sizing
        position: "relative",
        width: "100%",
        height: "70vh",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <Excalidraw
          key={conversationId}
          {...({
            excalidrawAPI: handleExcalidrawAPI,
            initialData: initialData ?? undefined,
            onChange: handleChange,
          } as unknown as React.ComponentProps<typeof Excalidraw>)}
        />
      </div>
    </div>
  );
}
