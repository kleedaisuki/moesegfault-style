import { type Blast, EMBER } from "./blast";
import { CLOVER_CELL, CLOVER_SIZE, type CloverTone } from "./clover";
import { threshold } from "./dither";

/** 设备像素与四叶草格子之间的换算。Maps clover cells to device pixels. */
export interface View {
  width: number;
  height: number;
  unit: number;
  left: number;
  top: number;
}

export type Palette = Record<CloverTone | "hot" | "ground" | "glow", string>;

export function readPalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element);
  const read = (name: keyof Palette): string => style.getPropertyValue(`--clover-${name}`).trim();
  return {
    ember: read("ember"),
    spark: read("spark"),
    leaf: read("leaf"),
    vein: read("vein"),
    stem: read("stem"),
    hot: read("hot"),
    ground: read("ground"),
    glow: read("glow"),
  };
}

const HALO = 46;
const CENTER = CLOVER_SIZE / 2;

/** 静止的底纹：以四叶草为中心、用抖动画出的光晕。The resting ground: a dithered halo around the clover. */
export function paintGround(context: CanvasRenderingContext2D, view: View, palette: Palette): void {
  const pitch = view.unit * EMBER;
  const side = Math.max(1, Math.round(pitch * 0.34));
  const columns = Math.ceil(view.width / pitch);
  const rows = Math.ceil(view.height / pitch);
  context.clearRect(0, 0, view.width, view.height);
  context.fillStyle = palette.ground;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = (column + 0.5) * EMBER - view.left / view.unit;
      const y = (row + 0.5) * EMBER - view.top / view.unit;
      const glow = 0.85 * (1 - Math.hypot(x - CENTER, y - CENTER) / HALO) ** 2;
      if (glow < threshold(column, row)) continue;
      context.fillRect(
        Math.round(column * pitch + (pitch - side) / 2),
        Math.round(row * pitch + (pitch - side) / 2),
        side,
        side,
      );
    }
  }
}

/** 余烬只用四档颜色，中间值交给抖动。Embers use four colors only; dithering supplies what lies between. */
function paintEmbers(
  context: CanvasRenderingContext2D,
  blast: Blast,
  view: View,
  palette: Palette,
): void {
  const { left, top, columns, rows, heat } = blast.embers;
  const ramp = [palette.glow, palette.spark, palette.leaf, palette.hot];
  const pitch = view.unit * EMBER;
  const side = Math.max(1, Math.round(pitch * 0.8));
  for (let at = 0; at < columns * rows; at++) {
    const value = heat[at] as number;
    if (value === 0) continue;
    const column = at % columns;
    const row = (at - column) / columns;
    const level = Math.floor(value * ramp.length + threshold(column, row)) - 1;
    if (level < 0) continue;
    context.fillStyle = ramp[Math.min(level, ramp.length - 1)] as string;
    context.fillRect(
      Math.round(view.left + (left + column * EMBER) * view.unit),
      Math.round(view.top + (top + row * EMBER) * view.unit),
      side,
      side,
    );
  }
}

function paintCells(
  context: CanvasRenderingContext2D,
  blast: Blast,
  view: View,
  palette: Palette,
): void {
  const side = CLOVER_CELL * view.unit;
  for (const cell of blast.cells) {
    const x = view.left + (cell.x + cell.dx) * view.unit;
    const y = view.top + (cell.y + cell.dy) * view.unit;
    const cos = Math.cos(cell.angle);
    const sin = Math.sin(cell.angle);
    context.setTransform(cos, sin, -sin, cos, x, y);
    context.globalAlpha = 1;
    context.fillStyle = palette[cell.tone];
    context.fillRect(-side / 2, -side / 2, side, side);
    if (cell.heat === 0) continue;
    context.globalAlpha = Math.min(1, cell.heat);
    context.fillStyle = cell.tone === "ember" ? palette.glow : palette.hot;
    context.fillRect(-side / 2, -side / 2, side, side);
  }
  context.globalAlpha = 1;
}

function paintSparks(
  context: CanvasRenderingContext2D,
  blast: Blast,
  view: View,
  palette: Palette,
): void {
  const side = EMBER * view.unit;
  for (const spark of blast.sparks) {
    const scale = Math.min(1, spark.life * 3);
    context.fillStyle = spark.life > 0.5 ? palette.hot : palette.leaf;
    context.fillRect(
      view.left + spark.x * view.unit - (side * scale) / 2,
      view.top + spark.y * view.unit - (side * scale) / 2,
      side * scale,
      side * scale,
    );
  }
}

export function paintBlast(
  context: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  blast: Blast,
  view: View,
  palette: Palette,
): void {
  const shake = Math.round(blast.shake * 0.3 * view.unit * (2 * Math.random() - 1));
  const shaken = { ...view, left: view.left + shake, top: view.top - shake };
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, view.width, view.height);
  context.drawImage(ground, 0, 0);
  paintEmbers(context, blast, shaken, palette);
  paintCells(context, blast, shaken, palette);
  context.setTransform(1, 0, 0, 1, 0, 0);
  paintSparks(context, blast, shaken, palette);
}
