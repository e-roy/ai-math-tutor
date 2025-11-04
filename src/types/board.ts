// Excalidraw types are not directly exported, so we use a more generic approach
// The actual types will be inferred from usage
export type ExcalidrawElement = unknown;
export type AppState = unknown;
export type BinaryFiles = unknown;

/**
 * Excalidraw scene data structure
 * Matches the format expected by Excalidraw component's initialData prop
 * Using unknown for flexibility - types will be validated at runtime
 */
export interface ExcalidrawScene {
  elements: readonly unknown[];
  appState?: Partial<Record<string, unknown>>;
  files?: Record<string, unknown>;
}

/**
 * Board state stored in database
 * Contains scene data and version information
 */
export interface BoardState {
  scene: ExcalidrawScene;
  version: number;
}

/**
 * Board data returned from API
 */
export interface BoardData {
  boardId?: string;
  scene: ExcalidrawScene;
  version: number;
}

/**
 * Snapshot data
 */
export interface BoardSnapshot {
  snapshotId: string;
  boardId: string;
  version: number;
  scene: ExcalidrawScene;
  createdAt: Date;
}

/**
 * Custom data stored in Excalidraw image elements for LaTeX
 */
export interface LaTeXImageCustomData {
  latex: string;
  type: "latex";
}
