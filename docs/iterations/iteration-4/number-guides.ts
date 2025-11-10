/**
 * Generate Excalidraw freedraw elements for number guides
 * These are used as tracing templates for handwriting practice
 */

type ExcalidrawFreedrawElement = Record<string, unknown> & {
  type: "freedraw";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  points: number[][];
  locked: boolean;
  seed: number;
  version: number;
  versionNonce: number;
};

/**
 * Generate a random ID for elements
 */
function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Number path definitions as point arrays
 * Each number is defined as a series of strokes (arrays of points)
 * Coordinates are normalized to 0-100 range, can be scaled
 */
const NUMBER_PATHS: Record<string, Array<Array<[number, number]>>> = {
  "0": [
    // Circle: start top, go clockwise
    [
      [50, 10],
      [60, 10],
      [70, 15],
      [75, 25],
      [75, 50],
      [75, 75],
      [70, 85],
      [60, 90],
      [50, 90],
      [40, 90],
      [30, 85],
      [25, 75],
      [25, 50],
      [25, 25],
      [30, 15],
      [40, 10],
      [50, 10],
    ],
  ],
  "1": [
    // Vertical line
    [
      [50, 10],
      [50, 90],
    ],
  ],
  "2": [
    // Top curve, diagonal, bottom curve
    [
      [30, 20],
      [40, 15],
      [50, 15],
      [60, 15],
      [70, 20],
      [70, 35],
      [65, 45],
      [30, 75],
      [30, 85],
      [70, 85],
    ],
  ],
  "3": [
    // Two curves
    [
      [30, 15],
      [50, 15],
      [65, 25],
      [65, 40],
      [50, 50],
      [65, 60],
      [65, 75],
      [50, 85],
      [30, 85],
    ],
  ],
  "4": [
    // Vertical, horizontal, diagonal
    [
      [40, 15],
      [40, 50],
      [70, 50],
      [70, 15],
      [70, 90],
    ],
  ],
  "5": [
    // Horizontal, vertical, curve
    [
      [30, 15],
      [60, 15],
      [60, 45],
      [50, 50],
      [30, 50],
      [30, 85],
      [60, 85],
    ],
  ],
  "6": [
    // Loop and curve
    [
      [60, 20],
      [50, 15],
      [35, 20],
      [30, 35],
      [30, 50],
      [30, 70],
      [40, 85],
      [60, 85],
      [70, 70],
      [70, 50],
      [60, 40],
      [50, 45],
    ],
  ],
  "7": [
    // Horizontal, diagonal
    [
      [30, 15],
      [70, 15],
      [50, 90],
    ],
  ],
  "8": [
    // Two loops
    [
      [50, 15],
      [65, 20],
      [70, 35],
      [70, 50],
      [65, 65],
      [50, 70],
      [35, 65],
      [30, 50],
      [30, 35],
      [35, 20],
      [50, 15],
      [50, 70],
    ],
  ],
  "9": [
    // Loop and vertical
    [
      [50, 15],
      [70, 20],
      [70, 50],
      [70, 70],
      [60, 85],
      [40, 85],
      [30, 70],
      [30, 50],
      [40, 40],
      [50, 45],
      [50, 15],
    ],
  ],
};

/**
 * Scale and translate points to fit within bounds
 */
function scalePoints(
  points: Array<[number, number]>,
  x: number,
  y: number,
  width: number,
  height: number,
): number[][] {
  return points.map(([px, py]) => {
    // Normalize from 0-100 to 0-1, then scale to bounds
    const scaledX = x + (px / 100) * width;
    const scaledY = y + (py / 100) * height;
    return [scaledX, scaledY];
  });
}

/**
 * Create a freedraw element from points
 */
function createFreedrawElement(
  points: number[][],
  x: number,
  y: number,
  width: number,
  height: number,
  strokeColor: string,
  strokeWidth: number,
  opacity: number,
  locked: boolean,
): ExcalidrawFreedrawElement {
  // Calculate bounding box from points
  const minX = Math.min(...points.map((p) => p[0] ?? 0));
  const maxX = Math.max(...points.map((p) => p[0] ?? 0));
  const minY = Math.min(...points.map((p) => p[1] ?? 0));
  const maxY = Math.max(...points.map((p) => p[1] ?? 0));

  return {
    id: randomId(),
    type: "freedraw",
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    angle: 0,
    strokeColor,
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth,
    strokeStyle: "solid",
    roundness: null,
    roughness: 0, // Smooth guide lines
    opacity,
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
    locked,
    points,
    pressures: points.map(() => 0.5), // Constant pressure
    simulatePressure: false,
    lastCommittedPoint: null,
  };
}

/**
 * Generate guide elements for a number
 * @param number - The digit (0-9) to generate
 * @param x - X position
 * @param y - Y position
 * @param width - Width of the number
 * @param height - Height of the number
 * @param opacity - Opacity (0-100), typically 30-50 for guides
 * @param locked - Whether the guide should be locked (non-editable)
 */
export function generateNumberGuide(
  number: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity = 40,
  locked = true,
): ExcalidrawFreedrawElement[] {
  const strokes = NUMBER_PATHS[number];
  if (!strokes) {
    throw new Error(`No guide path defined for number: ${number}`);
  }

  const elements: ExcalidrawFreedrawElement[] = [];

  for (const stroke of strokes) {
    const scaledPoints = scalePoints(stroke, x, y, width, height);
    const element = createFreedrawElement(
      scaledPoints,
      x,
      y,
      width,
      height,
      "#888888", // Gray color for guide
      2, // Thin stroke
      opacity,
      locked,
    );
    elements.push(element);
  }

  return elements;
}

/**
 * Check if an element is a guide (locked and has guide metadata)
 */
export function isGuideElement(element: unknown): boolean {
  if (!element || typeof element !== "object") return false;
  const el = element as Record<string, unknown>;
  return el.locked === true && el.type === "freedraw";
}

/**
 * Filter out guide elements from a scene
 */
export function filterGuideElements(elements: unknown[]): unknown[] {
  return elements.filter((el) => !isGuideElement(el));
}
