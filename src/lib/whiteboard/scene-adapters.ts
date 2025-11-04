import type { ExcalidrawScene } from "@/types/board";

/**
 * Convert Excalidraw scene to database JSON format
 * Ensures proper serialization for storage
 */
export function sceneToDbFormat(scene: ExcalidrawScene): unknown {
  // Excalidraw scenes are already JSON-serializable
  // We just need to ensure it's a plain object
  return {
    elements: scene.elements,
    appState: scene.appState ?? {},
    files: scene.files ?? {},
  };
}

/**
 * Convert database JSON format back to Excalidraw scene
 * Handles versioning and validates structure
 */
export function dbFormatToScene(dbJson: unknown): ExcalidrawScene {
  // Validate and convert database JSON to Excalidraw scene format
  if (!dbJson || typeof dbJson !== "object") {
    return {
      elements: [],
      appState: {},
      files: {} as Record<string, unknown>,
    };
  }

  const data = dbJson as Record<string, unknown>;

  return {
    elements: Array.isArray(data.elements) ? data.elements : [],
    appState:
      data.appState && typeof data.appState === "object"
        ? (data.appState as Partial<Record<string, unknown>>)
        : {},
    files:
      data.files && typeof data.files === "object"
        ? (data.files as Record<string, unknown>)
        : ({} as Record<string, unknown>),
  };
}

/**
 * Create an empty scene for new boards
 */
export function createEmptyScene(): ExcalidrawScene {
  return {
    elements: [],
    appState: {},
    files: {} as Record<string, unknown>,
  };
}
