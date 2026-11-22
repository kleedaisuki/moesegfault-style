import { Button, Icon } from "@moesegfault/style/react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { addressOf } from "../lib/blast";
import { BlastStage, type Point } from "../lib/blast-stage";
import { CLOVER_SIZE } from "../lib/clover";

const CENTER = { x: CLOVER_SIZE / 2, y: CLOVER_SIZE / 2 - 1 };
const TAP_POWER = 1;
const CHARGED_POWER = 1.6;
/** 蓄满后自动引爆，按住不放也有结局。A full charge fires by itself, so holding on still ends. */
const FULL_CHARGE = 1600;

type Status =
  | { kind: "ready" }
  | { kind: "fault"; address: string; started: number }
  | { kind: "recovered"; address: string; elapsed: number };

function recovered(status: Status): Status {
  if (status.kind !== "fault") return status;
  const elapsed = performance.now() - status.started;
  return { kind: "recovered", address: status.address, elapsed };
}

function statusText(status: Status, en: boolean): string {
  if (status.kind === "ready") return "";
  if (status.kind === "fault") return `SIGSEGV @ ${status.address}`;
  const duration = `${Math.round(status.elapsed)} ms`;
  return en
    ? `${status.address} recovered in ${duration}`
    : `${status.address} 已恢复，${duration}`;
}

const prefersStillness = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 引爆并返回状态；减少动态时立即恢复。Detonate and report; under reduced motion recovery is immediate. */
function fire(stage: BlastStage | null, point: Point, power: number): Status {
  const address = addressOf(point.x, point.y);
  if (prefersStillness()) return { kind: "recovered", address, elapsed: 0 };
  stage?.detonate(point, power);
  return { kind: "fault", address, started: performance.now() };
}

/** 指针拂过、按住蓄力、松手引爆；弹簧把它拼回去。Brush, hold to charge, release to blast; springs put it back. */
export function Detonator({ locale }: { locale: "zh-CN" | "en" }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<BlastStage>(null);
  const [status, setStatus] = useState<Status>({ kind: "ready" });
  const [ready, setReady] = useState(false);
  const en = locale === "en";

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    const hero = field?.closest<HTMLElement>(".hero");
    if (!canvas || !field || !hero) return;
    const stage = new BlastStage(canvas, field, () => setStatus(recovered));
    const abort = new AbortController();
    const { signal } = abort;
    let timer = 0;
    let last: { x: number; y: number; time: number } | undefined;

    const release = (event: PointerEvent): void => {
      const level = stage.chargeLevel;
      clearTimeout(timer);
      if (level === undefined) return;
      const power = TAP_POWER + (CHARGED_POWER - TAP_POWER) * level;
      setStatus(fire(stage, stage.locate(event), power));
    };
    const press = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      if (prefersStillness()) {
        setStatus(fire(stage, stage.locate(event), TAP_POWER));
        return;
      }
      stage.charge(stage.locate(event));
      timer = window.setTimeout(() => release(event), FULL_CHARGE);
    };
    const brush = (event: PointerEvent): void => {
      const point = stage.locate(event);
      const before = last;
      last = { ...point, time: event.timeStamp };
      const seconds = (event.timeStamp - (before?.time ?? event.timeStamp)) / 1000;
      if (!before || seconds <= 0 || seconds > 0.2 || prefersStillness()) return;
      stage.stir(point, { x: (point.x - before.x) / seconds, y: (point.y - before.y) / seconds });
    };

    field.addEventListener("pointerdown", press, { signal });
    hero.addEventListener("pointermove", brush, { signal, passive: true });
    window.addEventListener("pointerup", release, { signal });
    window.addEventListener(
      "pointercancel",
      () => {
        clearTimeout(timer);
        stage.relax();
      },
      { signal },
    );
    /* 跨页过渡要截取静态图，先把画布让开。The page transition captures the static drawing, so step aside first. */
    window.addEventListener("pageswap", () => flushSync(() => setReady(false)), { signal });
    window.addEventListener("pageshow", () => setReady(true), { signal });
    stageRef.current = stage;
    setReady(true);
    if (!prefersStillness()) stage.ignite(CENTER, 0.55);
    return () => {
      abort.abort();
      clearTimeout(timer);
      stage.dispose();
    };
  }, []);

  return (
    <div className="detonator" data-ready={ready || undefined}>
      <canvas className="clover detonator__stage" ref={canvasRef} />
      {/* 键盘与读屏使用下方按钮。Keyboard and screen-reader users get the button below. */}
      <div className="detonator__field" ref={fieldRef} />
      <div className="detonator__bar">
        <Button
          onClick={() => setStatus(fire(stageRef.current, CENTER, TAP_POWER))}
          size="sm"
          variant="secondary"
        >
          <Icon name="bomb" size={16} />
          {en ? "Detonate" : "引爆"}
        </Button>
        <output>{statusText(status, en)}</output>
      </div>
    </div>
  );
}
