/** 像素四叶草的单一模型：静态 SVG 与可引爆画布共用。One pixel-clover model shared by the static SVG and the canvas. */
export const CLOVER_SIZE = 27;
/** 四周留给爆炸的空格数。Empty cells around the drawing, reserved for the blast. */
export const CLOVER_MARGIN = 2;
/** 单格填充比例，余下是格缝。Filled share of a cell; the rest is the gap. */
export const CLOVER_CELL = 0.82;
const CENTER = (CLOVER_SIZE - 1) / 2;

export type CloverTone = "ember" | "spark" | "leaf" | "vein" | "stem";

export interface CloverCell {
  column: number;
  row: number;
  tone: CloverTone;
}

/** 定点整数散列，使每次构建得到相同的火星。Integer hash so every build scatters the same embers. */
function noise(column: number, row: number): number {
  let value = Math.imul(column + 11, 0x9e3779b1) ^ Math.imul(row + 7, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 15), 0xc2b2ae35);
  return ((value ^ (value >>> 13)) >>> 0) / 2 ** 32;
}

/** 心形隐式方程；尖端朝向叶心。Implicit heart whose point faces the clover's center. */
function insideLeaf(along: number, across: number): boolean {
  const y = (along - 0.43) / 0.385;
  const x = across / 0.385;
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

function toneAt(column: number, row: number): CloverTone | undefined {
  const x = column - CENTER;
  const y = row - CENTER + 1;
  const unit = CLOVER_SIZE / 2;
  /* 四片叶子互为旋转，取绝对值即可归为一片。The leaves are rotations of one, so absolute values fold them together. */
  const along = (Math.abs(x) + Math.abs(y)) / Math.SQRT2 / unit;
  const across = (Math.abs(x) - Math.abs(y)) / Math.SQRT2 / unit;
  if (x * y !== 0 && insideLeaf(along, across)) {
    return across === 0 && along < 0.62 ? "vein" : "leaf";
  }
  if (y >= 0 && x === Math.round(0.06 * Math.max(0, y - 9) ** 2)) return "stem";
  // Keep the gaps between leaves dark so four hearts stay four.
  if (x * y === 0) return undefined;
  const chance = noise(column, row);
  if (chance > 0.975) return "spark";
  return chance > 0.5 + (Math.hypot(x, y) / unit) * 0.08 ? "ember" : undefined;
}

export const cloverCells: readonly CloverCell[] = Array.from(
  { length: CLOVER_SIZE ** 2 },
  (_, index) => {
    const column = index % CLOVER_SIZE;
    const row = Math.floor(index / CLOVER_SIZE);
    const tone = toneAt(column, row);
    return tone && { column, row, tone };
  },
).filter((cell): cell is CloverCell => cell !== undefined);
