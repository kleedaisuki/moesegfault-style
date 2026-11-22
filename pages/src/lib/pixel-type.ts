/** 5×7 点阵，只覆盖版本号会用到的字符。A 5×7 bitmap covering only what version numbers use. */
const glyphs: Record<string, readonly string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
};

export interface PixelType {
  width: number;
  height: number;
  cells: { column: number; row: number }[];
}

/** 排成点阵；有字符缺字形时返回 undefined，由调用方退回普通文字。Set text in the bitmap, or undefined when a glyph is missing so callers keep plain text. */
export function pixelType(text: string): PixelType | undefined {
  const cells: PixelType["cells"] = [];
  let left = 0;
  for (const character of text) {
    const rows = glyphs[character];
    if (!rows) return undefined;
    const lit = rows.flatMap((bits, row) =>
      [...bits].flatMap((bit, column) => (bit === "1" ? [{ column: left + column, row }] : [])),
    );
    cells.push(...lit);
    left += (rows[0] as string).length + 1;
  }
  return { width: left - 1, height: 7, cells };
}
