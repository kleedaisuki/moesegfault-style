import {
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
} from "./blast";
import { type Palette, paintBlast, paintGround, readPalette, type View } from "./blast-painter";
import { CLOVER_MARGIN, CLOVER_SIZE } from "./clover";

const EXTENT = CLOVER_SIZE + 2 * CLOVER_MARGIN;
const MAX_RATIO = 2;

export interface Point {
  x: number;
  y: number;
}

/**
 * 把模拟接到画布：只在有东西要动、且看得见时才跑循环。
 * Wires the simulation to a canvas; the loop runs only while something moves and is visible.
 */
export class BlastStage {
  private readonly blast: Blast = createBlast();
  private readonly context: CanvasRenderingContext2D;
  private readonly ground: CanvasRenderingContext2D;
  private readonly observers: { disconnect(): void }[];
  private view: View = { width: 0, height: 0, unit: 1, left: 0, top: 0 };
  private palette: Palette;
  private request = 0;
  private previous = 0;
  private visible = true;
  private whole = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly field: HTMLElement,
    private readonly onWhole: () => void,
  ) {
    this.context = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.ground = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
    this.palette = readPalette(canvas);
    const resize = new ResizeObserver(() => this.measure());
    const theme = new MutationObserver(() => this.measure());
    const sight = new IntersectionObserver(([entry]) => this.setVisible(entry?.isIntersecting));
    resize.observe(canvas);
    resize.observe(field);
    theme.observe(document.documentElement, { attributeFilter: ["data-moe-theme"] });
    sight.observe(canvas);
    this.observers = [resize, theme, sight];
    this.measure();
  }

  dispose(): void {
    for (const observer of this.observers) observer.disconnect();
    cancelAnimationFrame(this.request);
  }

  /** 视口坐标换算为格子坐标。Viewport coordinates to clover cells. */
  locate(event: { clientX: number; clientY: number }): Point {
    const box = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / box.width / this.view.unit;
    return {
      x: (event.clientX - box.left) * scale - this.view.left / this.view.unit,
      y: (event.clientY - box.top) * scale - this.view.top / this.view.unit,
    };
  }

  charge({ x, y }: Point): void {
    beginCharge(this.blast, x, y);
    this.wake();
  }

  /** 放弃蓄力；弹簧自然复原。Abandon the charge and let the springs recover. */
  relax(): void {
    this.blast.charge = undefined;
  }

  get chargeLevel(): number | undefined {
    return this.blast.charge?.level;
  }

  detonate({ x, y }: Point, power: number): void {
    detonate(this.blast, x, y, power);
    this.wake();
  }

  ignite({ x, y }: Point, power: number): void {
    ignite(this.blast, x, y, power);
    this.wake();
  }

  stir({ x, y }: Point, velocity: Point): void {
    stir(this.blast, x, y, velocity.x, velocity.y);
    this.wake();
  }

  private measure(): void {
    const ratio = Math.min(devicePixelRatio, MAX_RATIO);
    const canvas = this.canvas.getBoundingClientRect();
    const field = this.field.getBoundingClientRect();
    const unit = (field.width / EXTENT) * ratio;
    const width = Math.round(canvas.width * ratio);
    const height = Math.round(canvas.height * ratio);
    const left = (field.left - canvas.left) * ratio + CLOVER_MARGIN * unit;
    const top = (field.top - canvas.top) * ratio + CLOVER_MARGIN * unit;
    this.view = { width, height, unit, left, top };
    this.palette = readPalette(this.canvas);
    for (const { canvas } of [this.context, this.ground]) {
      canvas.width = width;
      canvas.height = height;
    }
    frame(this.blast, -left / unit, -top / unit, (width - left) / unit, (height - top) / unit);
    paintGround(this.ground, this.view, this.palette);
    this.paint();
  }

  private paint(): void {
    if (this.view.width === 0) return;
    paintBlast(this.context, this.ground.canvas, this.blast, this.view, this.palette);
  }

  private setVisible(visible = false): void {
    this.visible = visible;
    if (visible) this.wake();
  }

  private wake(): void {
    if (this.request !== 0 || !this.visible) return;
    this.previous = performance.now();
    this.request = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.request = 0;
    advance(this.blast, Math.max(0, now - this.previous) / 1000);
    this.paint();
    const whole = isWhole(this.blast);
    if (whole && !this.whole) this.onWhole();
    this.whole = whole;
    if (isStill(this.blast) || !this.visible) return;
    this.previous = now;
    this.request = requestAnimationFrame((next) => this.tick(next));
  }
}
