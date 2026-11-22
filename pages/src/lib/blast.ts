import { CLOVER_SIZE, type CloverTone, cloverCells } from "./clover";

/*
 * 纯模拟：无 DOM、无时钟、随机数可复现；长度单位为四叶草的一格，时间单位为秒。
 * A pure simulation: no DOM, no clock, reproducible randomness. Lengths are clover cells and times are seconds.
 */

/** 固定步长使结果与刷新率无关。A fixed step makes the outcome independent of the refresh rate. */
export const STEP = 1 / 120;
const EMBER_STEP = 1 / 30;
/** 单帧最多追赶的时间；后台标签页回来不会瞬移。Most time one frame may catch up, so a returning tab never teleports. */
const CATCH_UP = 0.05;

const STIFFNESS = 110;
const FRICTION = 13;
const GRAVITY = 22;
const DRAG = 2.2;
const COOLING = 2.4;
const SHOCK_SPEED = 46;
const SHOCK_FADE = 20;
const KICK = 27;
const KICK_REACH = 9;
const PULL = 520;
const STIR_REACH = 3.4;
const STIR_LIMIT = 60;
const QUARTER = Math.PI / 2;

/** 余烬格的边长；比四叶草细一倍。Side of one ember pixel, half a clover cell. */
export const EMBER = 0.5;
const COLD = 0.02;

export interface Cell {
  readonly x: number;
  readonly y: number;
  readonly tone: CloverTone;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  heat: number;
  /** 剩余的自由飞行时间；归零后弹簧接管。Remaining free flight; the spring takes over at zero. */
  loose: number;
  /** 是否被冲击波掀起过，用于归位时的闪光。Whether a shock tore it off, so it can glint on return. */
  torn: boolean;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Shock {
  readonly x: number;
  readonly y: number;
  readonly power: number;
  readonly kicks: boolean;
  radius: number;
}

export interface EmberGrid {
  left: number;
  top: number;
  columns: number;
  rows: number;
  heat: Float32Array;
}

export interface Blast {
  readonly cells: readonly Cell[];
  sparks: Spark[];
  shocks: Shock[];
  embers: EmberGrid;
  charge: { x: number; y: number; level: number } | undefined;
  shake: number;
  lag: number;
  emberLag: number;
  random: () => number;
}

/** mulberry32：一行状态，足够均匀。mulberry32: one word of state and uniform enough. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
}

export function createBlast(seed = 11): Blast {
  return {
    cells: cloverCells.map(({ column, row, tone }) => ({
      x: column + 0.5,
      y: row + 0.5,
      tone,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      heat: 0,
      loose: 0,
      torn: false,
    })),
    sparks: [],
    shocks: [],
    embers: { left: 0, top: 0, columns: 0, rows: 0, heat: new Float32Array(0) },
    charge: undefined,
    shake: 0,
    lag: 0,
    emberLag: 0,
    random: seeded(seed),
  };
}

/** 让余烬格覆盖给定的画面范围。Make the ember grid cover the given extent. */
export function frame(
  blast: Blast,
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
  const columns = Math.ceil((right - left) / EMBER);
  const rows = Math.ceil((bottom - top) / EMBER);
  blast.embers = { left, top, columns, rows, heat: new Float32Array(columns * rows) };
}

function warm(
  { left, top, columns, rows, heat }: EmberGrid,
  x: number,
  y: number,
  value: number,
): void {
  const column = Math.floor((x - left) / EMBER);
  const row = Math.floor((y - top) / EMBER);
  if (column < 0 || row < 0 || column >= columns || row >= rows) return;
  const at = row * columns + column;
  heat[at] = Math.max(heat[at] as number, value);
}

/** 只照亮余烬，不掀动像素。Lights the embers without moving a pixel. */
export function ignite(blast: Blast, x: number, y: number, power: number): void {
  blast.shocks.push({ x, y, power, kicks: false, radius: 0 });
}

export function detonate(blast: Blast, x: number, y: number, power: number): void {
  blast.charge = undefined;
  blast.shake = power;
  blast.shocks.push({ x, y, power, kicks: true, radius: 0 });
  const count = Math.round(18 + 26 * power);
  for (let index = 0; index < count; index++) {
    const heading = blast.random() * 2 * Math.PI;
    const speed = (14 + 34 * blast.random()) * Math.sqrt(power);
    blast.sparks.push({
      x,
      y,
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed - 8,
      life: 0.5 + 0.9 * blast.random(),
    });
  }
}

/** 指针像风一样拂过：推动近处的格子，留下一点余温。The pointer passes like wind, nudging near cells and leaving warmth. */
export function stir(blast: Blast, x: number, y: number, vx: number, vy: number): void {
  const speed = Math.hypot(vx, vy);
  const limit = Math.min(1, STIR_LIMIT / (speed || 1));
  for (const cell of blast.cells) {
    const distance = Math.hypot(cell.x + cell.dx - x, cell.y + cell.dy - y);
    if (distance > STIR_REACH) continue;
    const share = 0.2 * limit * (1 - distance / STIR_REACH);
    cell.vx += vx * share;
    cell.vy += vy * share;
    cell.heat = Math.max(cell.heat, 2 * share * Math.min(1, speed / 20));
  }
  trail(blast, x, y, Math.min(0.9, speed / 40));
}

/** 拖尾是一撮而非一条线。A trail is a scatter, not a line. */
function trail(blast: Blast, x: number, y: number, value: number): void {
  for (let index = 0; index < 5; index++) {
    const spread = 2 * EMBER * index * 0.4;
    const px = x + (blast.random() - 0.5) * spread;
    const py = y + (blast.random() - 0.5) * spread;
    warm(blast.embers, px, py, value * (1 - index * 0.15));
  }
}

export function beginCharge(blast: Blast, x: number, y: number): void {
  blast.charge = { x, y, level: 0 };
}

function kick(blast: Blast, cell: Cell, shock: Shock): void {
  const ax = cell.x + cell.dx - shock.x;
  const ay = cell.y + cell.dy - shock.y;
  const distance = Math.hypot(ax, ay) || 0.01;
  const force = shock.power * Math.exp(-distance / KICK_REACH);
  const speed = KICK * force * (0.75 + 0.5 * blast.random());
  cell.vx += (ax / distance) * speed;
  cell.vy += (ay / distance) * speed - 4 * force;
  cell.spin += (blast.random() - 0.5) * 22 * force;
  cell.loose = Math.min(0.75, (0.12 + 0.45 * blast.random()) * Math.sqrt(force));
  cell.heat = Math.max(cell.heat, Math.min(1, force * 1.4));
  cell.torn ||= force > 0.25;
}

/** 冲击波在扫过的瞬间起作用：格子被推开，余烬被点亮。A shock acts as it sweeps past: cells are kicked, embers lit. */
function advanceShock(blast: Blast, shock: Shock): boolean {
  const inner = shock.radius;
  shock.radius += SHOCK_SPEED * STEP;
  if (shock.kicks) {
    for (const cell of blast.cells) {
      const distance = Math.hypot(cell.x - shock.x, cell.y - shock.y);
      if (distance >= inner && distance < shock.radius) kick(blast, cell, shock);
    }
  }
  const glow = shock.power * Math.exp(-inner / SHOCK_FADE);
  lightRing(blast, shock, inner, glow);
  return glow > 0.06;
}

function lightRing(blast: Blast, shock: Shock, inner: number, glow: number): void {
  const { left, top, columns, rows, heat } = blast.embers;
  for (let row = 0; row < rows; row++) {
    const dy = top + (row + 0.5) * EMBER - shock.y;
    for (let column = 0; column < columns; column++) {
      const dx = left + (column + 0.5) * EMBER - shock.x;
      const distance = Math.hypot(dx, dy);
      if (distance < inner || distance >= shock.radius) continue;
      const at = row * columns + column;
      heat[at] = Math.max(heat[at] as number, Math.min(1, glow * (0.35 + 0.65 * blast.random())));
    }
  }
}

function advanceCell(cell: Cell, charge: Blast["charge"], random: () => number): void {
  if (charge) implode(cell, charge, random);
  if (cell.loose > 0) {
    cell.loose -= STEP;
    const drag = Math.exp(-DRAG * STEP);
    cell.vx *= drag;
    cell.vy = cell.vy * drag + GRAVITY * STEP;
  } else {
    cell.vx += (-STIFFNESS * cell.dx - FRICTION * cell.vx) * STEP;
    cell.vy += (-STIFFNESS * cell.dy - FRICTION * cell.vy) * STEP;
    /* 正方形每转四分之一圈重合，归到最近的一档即可。A square repeats every quarter turn, so settle on the nearest. */
    const rest = Math.round(cell.angle / QUARTER) * QUARTER;
    cell.spin += (STIFFNESS * (rest - cell.angle) - FRICTION * cell.spin) * STEP;
  }
  cell.dx += cell.vx * STEP;
  cell.dy += cell.vy * STEP;
  cell.angle += cell.spin * STEP;
  cell.heat *= Math.exp(-COOLING * STEP);
  if (cell.heat < COLD) cell.heat = 0;
  if (isNearHome(cell)) settle(cell);
}

/** 引爆前先向内收：动画里的预备动作。Draw inward before the blast: anticipation, as animators call it. */
function implode(cell: Cell, charge: NonNullable<Blast["charge"]>, random: () => number): void {
  const ax = charge.x - cell.x - cell.dx;
  const ay = charge.y - cell.y - cell.dy;
  const distance = Math.hypot(ax, ay) || 0.01;
  const pull = PULL * charge.level * Math.exp(-distance / 7) * Math.min(1, distance);
  const tremble = 260 * charge.level ** 2 * Math.exp(-distance / 7);
  cell.vx += ((ax / distance) * pull + (random() - 0.5) * tremble) * STEP;
  cell.vy += ((ay / distance) * pull + (random() - 0.5) * tremble) * STEP;
  cell.heat = Math.max(cell.heat, 0.85 * charge.level * Math.exp(-distance / 4.5));
}

function isNearHome(cell: Cell): boolean {
  return (
    cell.loose <= 0 &&
    Math.abs(cell.dx) + Math.abs(cell.dy) < 0.012 &&
    Math.abs(cell.vx) + Math.abs(cell.vy) < 0.12
  );
}

function settle(cell: Cell): void {
  cell.dx = 0;
  cell.dy = 0;
  cell.vx = 0;
  cell.vy = 0;
  cell.angle = 0;
  cell.spin = 0;
  cell.loose = 0;
  if (cell.torn) cell.heat = 0.6;
  cell.torn = false;
}

function advanceSpark(blast: Blast, spark: Spark): boolean {
  const drag = Math.exp(-1.6 * STEP);
  spark.vx *= drag;
  spark.vy = spark.vy * drag + GRAVITY * STEP;
  spark.x += spark.vx * STEP;
  spark.y += spark.vy * STEP;
  spark.life -= STEP;
  warm(blast.embers, spark.x, spark.y, Math.min(1, spark.life * 1.4));
  return spark.life > 0;
}

/** 余烬上升、横移、冷却；自上而下原地更新即可读到未改写的下一行。Embers rise, drift, and cool; updating downward in place reads an untouched next row. */
function advanceEmbers({ embers, random }: Blast): void {
  const { columns, rows, heat } = embers;
  for (let at = 0; at < columns * rows; at++) {
    const column = at % columns;
    const source = Math.min(columns - 1, Math.max(0, column + Math.floor(random() * 3) - 1));
    const below = heat[at - column + columns + source] ?? 0;
    const value = (heat[at] as number) * 0.66 + below * 0.27;
    heat[at] = value < COLD ? 0 : value;
  }
}

function advanceStep(blast: Blast): void {
  if (blast.charge) blast.charge.level = Math.min(1, blast.charge.level + STEP / 1.4);
  blast.shocks = blast.shocks.filter((shock) => advanceShock(blast, shock));
  for (const cell of blast.cells) advanceCell(cell, blast.charge, blast.random);
  blast.sparks = blast.sparks.filter((spark) => advanceSpark(blast, spark));
  blast.shake *= Math.exp(-10 * STEP);
  blast.emberLag += STEP;
  if (blast.emberLag < EMBER_STEP) return;
  blast.emberLag -= EMBER_STEP;
  advanceEmbers(blast);
}

export function advance(blast: Blast, seconds: number): void {
  blast.lag += Math.min(seconds, CATCH_UP);
  while (blast.lag >= STEP) {
    advanceStep(blast);
    blast.lag -= STEP;
  }
}

/** 每一格都已归位。Every cell is home. */
export function isWhole(blast: Blast): boolean {
  return (
    !blast.charge &&
    blast.shocks.every((shock) => !shock.kicks || shock.radius > 2 * CLOVER_SIZE) &&
    blast.cells.every((cell) => !cell.torn && cell.dx === 0 && cell.dy === 0)
  );
}

/** 没有任何东西还在变化，循环可以停。Nothing is changing anymore, so the loop may stop. */
export function isStill(blast: Blast): boolean {
  return (
    isWhole(blast) &&
    blast.shocks.length === 0 &&
    blast.sparks.length === 0 &&
    blast.cells.every((cell) => cell.heat === 0) &&
    blast.embers.heat.every((heat) => heat === 0)
  );
}

/** 把四叶草当作一段内存时的出错地址。The fault address, treating the clover as a memory segment. */
export function addressOf(x: number, y: number): string {
  const clamp = (value: number): number =>
    Math.min(CLOVER_SIZE - 1, Math.max(0, Math.floor(value)));
  return `0x${(clamp(y) * CLOVER_SIZE + clamp(x)).toString(16).padStart(4, "0")}`;
}
