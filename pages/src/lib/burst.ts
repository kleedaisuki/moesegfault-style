const COUNT = 12;
const LIFE = 620;
const GRAVITY = 46;

/** 从元素中心迸出几枚像素火星，落下即移除。Throw a few pixel sparks from an element's center and remove them as they fall. */
export function burst(origin: Element): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = origin.getBoundingClientRect();
  for (let index = 0; index < COUNT; index++) {
    const spark = document.createElement("i");
    spark.className = "pixel-spark";
    spark.ariaHidden = "true";
    spark.style.left = `${box.left + box.width / 2}px`;
    spark.style.top = `${box.top + box.height / 2}px`;
    document.body.append(spark);
    throwSpark(spark, index);
  }
}

function throwSpark(spark: HTMLElement, index: number): void {
  const heading = ((index + Math.random()) / COUNT) * 2 * Math.PI;
  const reach = 18 + 26 * Math.random();
  const x = Math.cos(heading) * reach;
  const y = Math.sin(heading) * reach - 12;
  const flight = spark.animate(
    [
      { translate: "0 0", scale: 1, easing: "cubic-bezier(0.1, 0.8, 0.4, 1)" },
      { translate: `${x}px ${y}px`, scale: 1, easing: "cubic-bezier(0.6, 0, 1, 1)" },
      { translate: `${x * 1.3}px ${y + GRAVITY}px`, scale: 0 },
    ],
    { duration: LIFE * (0.7 + 0.5 * Math.random()), fill: "forwards" },
  );
  flight.onfinish = () => spark.remove();
}
