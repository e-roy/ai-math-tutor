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
 * Sanitize appState to ensure Excalidraw-required properties are properly formatted
 * Fixes issues with collaborators and other properties that must be arrays
 */
function sanitizeAppState(
  appState: Partial<Record<string, unknown>>,
): Partial<Record<string, unknown>> {
  const sanitized = { ...appState };

  // Ensure collaborators is always an array or undefined
  // Excalidraw's InteractiveCanvas expects collaborators.forEach to work
  if ("collaborators" in sanitized) {
    if (Array.isArray(sanitized.collaborators)) {
      // Keep it as is - it's already an array
    } else {
      // Remove invalid collaborators property (not an array)
      // Excalidraw will handle undefined correctly
      delete sanitized.collaborators;
    }
  }

  return sanitized;
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

  const rawAppState =
    data.appState && typeof data.appState === "object"
      ? (data.appState as Partial<Record<string, unknown>>)
      : {};

  // Sanitize appState to ensure Excalidraw-compatible format
  const sanitizedAppState = sanitizeAppState(rawAppState);

  return {
    elements: Array.isArray(data.elements) ? data.elements : [],
    appState: sanitizedAppState,
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
