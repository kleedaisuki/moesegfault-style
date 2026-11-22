/** 全站共用的 8×8 Bayer 阈值；像素不做透明度，只做疏密。The site's one 8×8 Bayer threshold: pixels vary in density, never in opacity. */
const SIDE = 8;

/** 逐位交织坐标得到 Bayer 序。Interleaving the coordinate bits yields Bayer order. */
function bayerRank(column: number, row: number): number {
  let rank = 0;
  for (let bit = 0; bit < 3; bit++) {
    const y = (row >> bit) & 1;
    const x = (column >> bit) & 1;
    rank = (rank << 2) | (((x ^ y) << 1) | y);
  }
  return rank;
}

const thresholds = Float32Array.from(
  { length: SIDE * SIDE },
  (_, index) => (bayerRank(index % SIDE, Math.floor(index / SIDE)) + 0.5) / (SIDE * SIDE),
);

/** 取值 (0, 1)；平均为 ½，因此抖动不改变整体明度。Within (0, 1) and averaging ½, so dithering preserves tone. */
export function threshold(column: number, row: number): number {
  return thresholds[(row & (SIDE - 1)) * SIDE + (column & (SIDE - 1))] as number;
}

/** 自上而下由疏到密的横向可平铺遮罩。A horizontally tiling mask that goes from sparse to dense. */
export function ditherMask(rows: number): string {
  const pixels = Array.from({ length: SIDE * rows }, (_, index) => ({
    column: index % SIDE,
    row: Math.floor(index / SIDE),
  }))
    .filter(({ column, row }) => (row + 0.5) / rows > threshold(column, row))
    .map(({ column, row }) => `M${column} ${row}h1v1h-1z`)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIDE} ${rows}' shape-rendering='crispEdges'><path d='${pixels}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
