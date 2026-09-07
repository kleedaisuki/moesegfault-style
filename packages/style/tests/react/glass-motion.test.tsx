import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlassCard, GlassPanel, GlassToolbar } from "../../src/react/Glass";
import { Motion } from "../../src/react/Motion";

describe("glass surfaces", () => {
  it("preserves native attributes, content and semantic articles", () => {
    render(
      <GlassCard tone="rose" className="custom" aria-label="Note">
        <p>Visible content</p>
      </GlassCard>,
    );
    const card = screen.getByRole("article", { name: "Note" });
    expect(card).toHaveClass("moe-glass", "moe-glass-card", "custom");
    expect(card).toHaveAttribute("data-tone", "rose");
    expect(screen.getByText("Visible content")).toBeVisible();
  });

  it("does not imply toolbar keyboard behavior", () => {
    render(
      <GlassPanel data-testid="panel">
        <GlassToolbar data-testid="actions">
          <button type="button">Save</button>
        </GlassToolbar>
      </GlassPanel>,
    );
    expect(screen.getByTestId("panel")).toHaveAttribute("data-tone", "neutral");
    expect(screen.getByTestId("actions")).not.toHaveAttribute("role");
    expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
  });
});

describe("motion entrances", () => {
  it("keeps content and custom styles intact without JavaScript animation", () => {
    render(
      <Motion
        data-testid="motion"
        preset="scale"
        delay={80}
        duration={240}
        style={{ color: "red" }}
      >
        Hello
      </Motion>,
    );
    const motion = screen.getByTestId("motion");
    expect(motion).toHaveAttribute("data-motion", "scale");
    expect(motion.style.getPropertyValue("--moe-enter-delay")).toBe("80ms");
    expect(motion.style.getPropertyValue("--moe-enter-duration")).toBe("240ms");
    expect(motion.style.color).toBe("red");
    expect(motion).toBeVisible();
  });

  it("supports explicitly disabled motion and bounds unsafe timings", () => {
    const { rerender } = render(
      <Motion data-testid="motion" disabled delay={-10} duration={Infinity} />,
    );
    const motion = screen.getByTestId("motion");
    expect(motion).toHaveAttribute("data-motion-disabled", "true");
    expect(motion.style.getPropertyValue("--moe-enter-delay")).toBe("0ms");
    expect(motion.style.getPropertyValue("--moe-enter-duration")).toBe("0ms");
    rerender(<Motion data-testid="motion" delay={5000} />);
    expect(motion).not.toHaveAttribute("data-motion-disabled");
    expect(motion.style.getPropertyValue("--moe-enter-delay")).toBe("2000ms");
    expect(motion.style.getPropertyValue("--moe-enter-duration")).toBe("");
  });
});
