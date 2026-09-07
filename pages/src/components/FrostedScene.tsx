import { Button, GlassPanel } from "@moesegfault/style/react";
import { useState } from "react";
import "../styles/frosted-scene.css";

/** 实际文字与矢量画布上的玻璃，而非预先模糊的背景。Glass over live text and vector artwork, not a pre-blurred image. */
export function FrostedScene({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const [frosted, setFrosted] = useState(true);
  const en = locale === "en";
  return (
    <div className="frosted-demo" data-testid="frosted-demo">
      <div className="frosted-demo__controls">
        <p>
          {en
            ? "Same scene. A different view through the glass."
            : "同一幅风景，隔着一层温柔的雾。"}
        </p>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={frosted}
          onClick={() => setFrosted(!frosted)}
        >
          {en ? "Frosted glass" : "毛玻璃"} ·{" "}
          {frosted ? (en ? "On" : "已开启") : en ? "Off" : "已关闭"}
        </Button>
      </div>
      <div className="frosted-scene" data-testid="frosted-scene">
        <div className="frosted-scene__backdrop" data-testid="frosted-backdrop" aria-hidden="true">
          <p className="frosted-scene__script">Dear little universe,</p>
          <p className="frosted-scene__notes">
            {en
              ? "Let the light linger.\nKeep a little room for wonder.\nEvery thought begins somewhere."
              : "让光停一会儿。\n给奇思妙想，留一点空白。\n每一个念头，都有它的起点。"}
          </p>
          <p className="frosted-scene__throughline" aria-hidden="true">
            <span data-testid="frosted-through-text">
              {en ? "little rays of wonder" : "让每一束微光，都有回响"}
            </span>
          </p>
          <svg
            viewBox="0 0 800 340"
            preserveAspectRatio="none"
            className="frosted-scene__art"
            aria-hidden="true"
          >
            <circle cx="590" cy="120" r="92" fill="var(--moe-color-gold)" />
            <path
              d="M-50 300 Q180 10 380 250 T850 150"
              fill="none"
              stroke="var(--moe-accent)"
              strokeWidth="48"
            />
            <path
              d="M-50 210 Q250 380 440 130 T850 90"
              fill="none"
              stroke="var(--moe-color-gold)"
              strokeWidth="12"
            />
          </svg>
        </div>
        <GlassPanel
          className="frosted-scene__pane"
          tone="warm"
          blur={frosted ? 12 : 0}
          tintOpacity={frosted ? 0.42 : 0}
          data-testid="frosted-pane"
          data-frosted={frosted}
        >
          <span className="frosted-scene__label">
            {en ? "A WINDOW, NOT A WALL" : "是窗，不是墙"}
          </span>
          <h3>{en ? "Let the world show through." : "把世界，轻轻透进来。"}</h3>
          <p>
            {en
              ? "The letters soften. The colors wander. What matters stays in focus."
              : "文字隐去锋芒，色彩漫过边缘。眼前的心事，依然清晰。"}
          </p>
        </GlassPanel>
      </div>
      <p className="frosted-demo__caption">
        {en
          ? "Live text + SVG behind the pane. Reduced transparency and unsupported browsers use a solid surface."
          : "玻璃后方是真实文字与 SVG 画布；减少透明度模式或不支持的浏览器使用实色表面。"}
      </p>
    </div>
  );
}
