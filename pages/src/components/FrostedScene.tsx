import { GlassPanel, Switch } from "@moesegfault/style/react";
import { useState } from "react";

/** 玻璃后方的真实文本，跨过面板边界便于观察。Live text behind the glass, crossing its edges on purpose. */
const listing = [
  "0x0000  load   r0, [palette + 0x27]     ; klee-600",
  "0x0004  load   r1, [palette + 0x00]     ; snow-50",
  "0x0008  blend  r2, r0, r1, 0.42         ; tint",
  "0x000c  blur   r2, 12px                 ; backdrop",
  "0x0010  stroke r2, line-strong, 1px     ; hairline",
  "0x0014  round  r2, radius-md            ; 8px",
  "0x0018  store  [frame], r2              ; present",
  "0x001c  jump   0x0000",
].join("\n");

/** 实际文字与矢量画布上的玻璃，而非预先模糊的背景。Glass over live text and vector artwork, not a pre-blurred image. */
export function FrostedScene({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const [frosted, setFrosted] = useState(true);
  const en = locale === "en";
  return (
    <div className="stack" data-testid="frosted-demo">
      <Switch
        checked={frosted}
        label={en ? "Frosted" : "模糊"}
        onChange={(event) => setFrosted(event.currentTarget.checked)}
      />
      <div className="frosted-scene" data-testid="frosted-scene">
        <div aria-hidden="true" className="frosted-scene__backdrop" data-testid="frosted-backdrop">
          <svg preserveAspectRatio="none" viewBox="0 0 800 340">
            <title>{en ? "Signal traces" : "信号轨迹"}</title>
            <path
              d="M300 340V250H420V120H560V210H680V70H800"
              fill="none"
              stroke="var(--moe-accent)"
              strokeWidth="14"
            />
            <path
              d="M380 340V290H520V190H640V270H800"
              fill="none"
              stroke="var(--moe-color-honey-500)"
              strokeWidth="6"
            />
          </svg>
          <p>{listing}</p>
        </div>
        <GlassPanel
          blur={frosted ? 12 : 0}
          className="frosted-scene__pane"
          data-frosted={frosted}
          data-testid="frosted-pane"
          tintOpacity={frosted ? 0.42 : 0}
        >
          <h3>{en ? "Glass" : "玻璃"}</h3>
        </GlassPanel>
      </div>
    </div>
  );
}
