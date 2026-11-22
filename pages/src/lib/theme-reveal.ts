const POINTS = 96;
const PETAL = 0.26;
const DURATION = 680;

/** 四叶形轮廓；半径取最窄处仍能盖住最远角。A four-lobed outline whose narrowest reach still covers the farthest corner. */
function cloverPolygon(x: number, y: number, radius: number, turn: number): string {
  const points = Array.from({ length: POINTS }, (_, index) => {
    const angle = (index / POINTS) * 2 * Math.PI;
    const reach = radius * (1 + PETAL * Math.cos(4 * angle));
    const px = x + reach * Math.cos(angle + turn);
    const py = y + reach * Math.sin(angle + turn);
    return `${px.toFixed(1)}px ${py.toFixed(1)}px`;
  });
  return `polygon(${points.join(",")})`;
}

function unfold(origin: Element): void {
  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const corner = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.animate(
    {
      clipPath: [
        cloverPolygon(x, y, 0, -Math.PI / 2),
        cloverPolygon(x, y, corner / (1 - PETAL), Math.PI / 4),
      ],
    },
    {
      duration: DURATION,
      easing: "cubic-bezier(0.5, 0, 0.1, 1)",
      pseudoElement: "::view-transition-new(root)",
    },
  );
}

/** 新主题从按钮处以四叶形展开；不支持或减少动态时直接切换。The new theme unfolds from the button as a clover, or simply applies. */
export function revealTheme(origin: Element, apply: () => void): void {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !document.startViewTransition) {
    apply();
    return;
  }
  const root = document.documentElement;
  root.dataset.themeShift = "";
  const transition = document.startViewTransition(apply);
  transition.ready.then(() => unfold(origin)).catch(() => undefined);
  transition.finished.finally(() => delete root.dataset.themeShift);
}
