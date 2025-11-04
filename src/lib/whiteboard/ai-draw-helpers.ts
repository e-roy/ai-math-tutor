import type { LaTeXImageCustomData } from "@/types/board";

// Type definitions for Excalidraw elements
// Using permissive types since Excalidraw doesn't export all types directly
type ExcalidrawElement = Record<string, unknown>;
type ExcalidrawRectangleElement = ExcalidrawElement & { type: "rectangle" };
type ExcalidrawArrowElement = ExcalidrawElement & { type: "arrow" };
type ExcalidrawTextElement = ExcalidrawElement & { type: "text" };
type ExcalidrawImageElement = ExcalidrawElement & { type: "image" };

/**
 * Generate a random seed for element creation
 */
function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Generate a random ID for elements
 */
function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a rectangle/box element
 */
export function drawBox(
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
): ExcalidrawRectangleElement {
  const element: ExcalidrawRectangleElement = {
    id: randomId(),
    type: "rectangle",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "#ffffff",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roundness: { type: 3 },
    roughness: 1,
    opacity: 100,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: label ? [{ id: randomId(), type: "text" }] : null,
    updated: Date.now(),
    link: null,
    locked: false,
  };

  return element;
}

/**
 * Create an arrow element
 */
export function drawArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label?: string,
): ExcalidrawArrowElement {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  const element: ExcalidrawArrowElement = {
    id: randomId(),
    type: "arrow",
    x: x1,
    y: y1,
    width: length,
    height: 0,
    angle: Math.atan2(dy, dx),
    strokeColor: "#1e1e1e",
    backgroundColor: "#ffffff",
    fillStyle: "hachure",
    strokeWidth: 2,
    strokeStyle: "solid",
    roundness: null,
    roughness: 1,
    opacity: 100,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: label ? [{ id: randomId(), type: "text" }] : null,
    updated: Date.now(),
    link: null,
    locked: false,
    points: [
      [0, 0],
      [length, 0],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
  };

  return element;
}

/**
 * Create a text/label element
 */
export function drawLabel(
  x: number,
  y: number,
  text: string,
  fontSize = 20,
): ExcalidrawTextElement {
  const element: ExcalidrawTextElement = {
    id: randomId(),
    type: "text",
    x,
    y,
    width: 100, // Will auto-resize based on text
    height: fontSize * 1.2,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roundness: null,
    roughness: 1,
    opacity: 100,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fontSize,
    fontFamily: 1, // Virgil
    text,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    originalText: text,
    autoResize: true,
    lineHeight: 1.2,
  };

  return element;
}

/**
 * Create an image element containing LaTeX (stored as customData)
 * The actual image rendering will be handled by the component
 */
export function insertLatexAsImage(
  x: number,
  y: number,
  latex: string,
  width = 200,
  height = 50,
): ExcalidrawImageElement {
  const customData: LaTeXImageCustomData = {
    latex,
    type: "latex",
  };

  const element: ExcalidrawImageElement = {
    id: randomId(),
    type: "image",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roundness: null,
    roughness: 1,
    opacity: 100,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fileId: null,
    status: "pending",
    scale: [1, 1],
    crop: null,
    customData,
  };

  return element;
}

