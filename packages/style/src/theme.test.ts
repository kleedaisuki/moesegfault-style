import { describe, expect, it } from "vitest";
import { applyTheme, createThemeBootstrap, resolveTheme } from "./theme";

describe("theme", () => {
  it("resolves explicit and automatic preferences", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });

  it("applies the observable preference instead of collapsing auto", () => {
    const root = { dataset: {} as DOMStringMap };
    expect(applyTheme("auto", root)).toBe("auto");
    expect(root.dataset.moeTheme).toBe("auto");
  });

  it("escapes a custom storage key in the bootstrap source", () => {
    const script = createThemeBootstrap('theme";throw 1;//');
    expect(script).toContain(`localStorage.getItem(${JSON.stringify('theme";throw 1;//')})`);
    expect(script).toContain("dataset.moeTheme=p");
  });
});
