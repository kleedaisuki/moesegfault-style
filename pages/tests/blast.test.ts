import { describe, expect, it } from "vitest";
import {
  addressOf,
  advance,
  type Blast,
  beginCharge,
  createBlast,
  detonate,
  frame,
  ignite,
  isStill,
  isWhole,
  stir,
} from "../src/lib/blast";
import { CLOVER_SIZE } from "../src/lib/clover";
import { ditherMask, threshold } from "../src/lib/dither";
import { pixelType } from "../src/lib/pixel-type";

const CENTER = CLOVER_SIZE / 2;

function run(blast: Blast, seconds: number, rate: number): void {
  for (let frames = Math.round(seconds * rate); frames > 0; frames--) advance(blast, 1 / rate);
}

function exploded(rate: number, seconds: number): Blast {
  const blast = createBlast();
  frame(blast, -8, -8, 36, 36);
  detonate(blast, CENTER, CENTER, 1);
  run(blast, seconds, rate);
  return blast;
}

describe("blast simulation", () => {
  it("starts whole and still", () => {
    const blast = createBlast();
    expect(isWhole(blast)).toBe(true);
    expect(isStill(blast)).toBe(true);
  });

  it("scatters the clover and puts every cell back exactly", () => {
    const blast = exploded(60, 0.3);
    expect(isWhole(blast)).toBe(false);
    expect(Math.max(...blast.cells.map((cell) => Math.hypot(cell.dx, cell.dy)))).toBeGreaterThan(3);
    run(blast, 5, 60);
    expect(isStill(blast)).toBe(true);
    for (const cell of blast.cells) expect([cell.dx, cell.dy, cell.angle]).toEqual([0, 0, 0]);
    expect(blast.sparks).toEqual([]);
  });

  it("does not depend on the refresh rate", () => {
    const slow = exploded(60, 0.5);
    const fast = exploded(240, 0.5);
    const drift = slow.cells.map((cell, index) => {
      const other = fast.cells[index] as (typeof fast.cells)[number];
      return Math.hypot(cell.dx - other.dx, cell.dy - other.dy);
    });
    expect(drift.reduce((sum, value) => sum + value, 0) / drift.length).toBeLessThan(0.2);
  });

  it("stays bounded when a background tab returns after a long pause", () => {
    const blast = exploded(60, 0.1);
    advance(blast, 600);
    for (const cell of blast.cells) expect(Math.hypot(cell.dx, cell.dy)).toBeLessThan(40);
  });

  it("draws cells toward a held charge and lets go when relaxed", () => {
    const blast = createBlast();
    beginCharge(blast, CENTER, CENTER);
    run(blast, 1, 60);
    const near = blast.cells.filter(
      (cell) => Math.abs(Math.hypot(cell.x - CENTER, cell.y - CENTER) - 4) < 1,
    );
    const inward = near.map(
      (cell) =>
        Math.hypot(cell.x - CENTER, cell.y - CENTER) -
        Math.hypot(cell.x + cell.dx - CENTER, cell.y + cell.dy - CENTER),
    );
    expect(inward.reduce((sum, value) => sum + value, 0) / inward.length).toBeGreaterThan(0.5);
    blast.charge = undefined;
    run(blast, 4, 60);
    expect(isStill(blast)).toBe(true);
  });

  it("lights embers without moving cells when only igniting", () => {
    const blast = createBlast();
    frame(blast, -8, -8, 36, 36);
    ignite(blast, CENTER, CENTER, 0.5);
    run(blast, 0.2, 60);
    expect(isWhole(blast)).toBe(true);
    expect(blast.embers.heat.some((heat) => heat > 0)).toBe(true);
    run(blast, 5, 60);
    expect(isStill(blast)).toBe(true);
  });

  it("never carries embers across the edges", () => {
    const blast = createBlast();
    frame(blast, 0, 0, 10, 10);
    const { columns, rows, heat } = blast.embers;
    for (let row = 0; row < rows; row++) heat[row * columns + columns - 1] = 1;
    run(blast, 0.3, 60);
    for (let row = 0; row < rows; row++) expect(heat[row * columns]).toBe(0);
  });

  it("keeps a violent stir within reach", () => {
    const blast = createBlast();
    stir(blast, CENTER, CENTER, 1e6, 0);
    run(blast, 0.1, 60);
    for (const cell of blast.cells) expect(Math.abs(cell.dx)).toBeLessThan(2);
  });

  it("maps any point to an address inside the segment", () => {
    expect(addressOf(-5, -5)).toBe("0x0000");
    expect(addressOf(99, 99)).toBe("0x02d8");
  });
});

describe("pixel language", () => {
  it("orders all 64 Bayer thresholds evenly", () => {
    const values = Array.from({ length: 64 }, (_, index) => threshold(index % 8, index >> 3));
    expect(new Set(values).size).toBe(64);
    expect(values.reduce((sum, value) => sum + value, 0) / 64).toBeCloseTo(0.5);
  });

  it("builds a mask that only gets denser", () => {
    const mask = decodeURIComponent(ditherMask(16));
    const density = Array.from(
      { length: 16 },
      (_, row) => mask.match(new RegExp(`M\\d ${row}h`, "g"))?.length ?? 0,
    );
    const pairs = density.slice(0, 8).map((value, row) => [value, density[row + 8] as number]);
    for (const [above = 0, below = 0] of pairs) expect(below).toBeGreaterThan(above);
  });

  it("sets versions and declines unknown characters", () => {
    expect(pixelType("v0.2.0")?.width).toBe(27);
    expect(pixelType("v0.2.0-rc.1")).toBeUndefined();
  });
});
