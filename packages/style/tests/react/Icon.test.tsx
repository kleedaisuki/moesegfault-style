import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "../../src/react/Icon";

describe("Icon", () => {
  it("hides unnamed decoration without keyboard focus", () => {
    const { container } = render(<Icon name="sparkle" tabIndex={0} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("exposes meaningful names and native dimensions", () => {
    render(<Icon name="brand" title="MoeSegfault" size={48} width={64} />);
    expect(screen.getByRole("img", { name: "MoeSegfault" })).toHaveAttribute("width", "64");
    expect(screen.getByRole("img")).toHaveAttribute("height", "48");
  });

  it("supports aria labels and ignores empty titles", () => {
    render(<Icon name="sparkle" title=" " aria-label="Favorite" />);
    expect(screen.getByRole("img", { name: "Favorite" })).not.toHaveAttribute("aria-labelledby");
  });

  it("isolates gradient and title references across instances", () => {
    const { container } = render(
      <>
        <Icon name="brand" title="First" />
        <Icon name="brand" title="Second" />
      </>,
    );
    const gradients = [...container.querySelectorAll("linearGradient")];
    expect(new Set(gradients.map((element) => element.id)).size).toBe(2);
    const rectangles = [...container.querySelectorAll("rect")];
    rectangles.forEach((rect, index) => {
      expect(rect).toHaveAttribute("fill", `url(#${gradients[index]?.id})`);
    });
    expect(screen.getByRole("img", { name: "First" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Second" })).toBeVisible();
  });
});
