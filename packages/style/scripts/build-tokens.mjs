import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(packageRoot, "tokens", "tokens.dtcg.json");
const defaultOutputRoot = join(packageRoot, "dist");
const defaultGeneratedPath = join(packageRoot, "src", "tokens.generated.ts");
const referencePattern = /^\{([^}]+)\}$/;

/** @brief 判断对象是否为 DTCG 令牌节点 (Determine whether an object is a DTCG token node). */
function isToken(value) {
  return Boolean(value && typeof value === "object" && "$value" in value);
}

/** @brief 展平 DTCG 令牌树并继承分组类型 (Flatten a DTCG token tree while inheriting group types). */
function flatten(node, path = [], inheritedType, result = new Map()) {
  const type = node?.$type ?? inheritedType;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const tokenPath = [...path, key];
    if (isToken(value)) result.set(tokenPath.join("."), { ...value, $type: value.$type ?? type });
    else if (value && typeof value === "object") flatten(value, tokenPath, type, result);
  }
  return result;
}

/** @brief 递归解析复合值中的 DTCG 引用 (Recursively resolve DTCG references in composite values). */
function resolveValue(value, tokens, stack) {
  if (typeof value === "string") {
    const reference = value.match(referencePattern);
    return reference ? resolve(reference[1], tokens, stack) : value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, tokens, stack));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveValue(item, tokens, stack)]),
    );
  return value;
}

/** @brief 解析令牌引用并检测循环引用 (Resolve token references and detect reference cycles). */
function resolve(name, tokens, stack = []) {
  if (stack.includes(name))
    throw new Error(`Circular token reference: ${[...stack, name].join(" -> ")}`);
  const token = tokens.get(name);
  if (!token) throw new Error(`Unknown token reference: ${name}`);
  return resolveValue(token.$value, tokens, [...stack, name]);
}

/** @brief 断言条件满足，否则报告 DTCG 结构错误 (Assert a condition or report a DTCG structure error). */
function assertValid(condition, message) {
  if (!condition) throw new Error(`Invalid DTCG document: ${message}`);
}

/** @brief 校验一个已解析令牌值的规范结构 (Validate the normative structure of a resolved token value). */
function validateValue(value, type, name) {
  if (type === "color") {
    assertValid(
      value && typeof value === "object" && !Array.isArray(value),
      `${name} must be a color object`,
    );
    assertValid(typeof value.colorSpace === "string", `${name}.colorSpace must be a string`);
    assertValid(Array.isArray(value.components), `${name}.components must be an array`);
    assertValid(
      value.components.every((component) => Number.isFinite(component) || component === "none"),
      `${name}.components contains an invalid component`,
    );
    assertValid(
      value.alpha === undefined ||
        (Number.isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1),
      `${name}.alpha must be between 0 and 1`,
    );
    assertValid(
      value.hex === undefined || /^#[0-9a-fA-F]{6}$/.test(value.hex),
      `${name}.hex must be a six-digit CSS hexadecimal color`,
    );
    return;
  }
  if (type === "dimension" || type === "duration") {
    assertValid(
      value && typeof value === "object" && !Array.isArray(value),
      `${name} must be an object`,
    );
    assertValid(Number.isFinite(value.value), `${name}.value must be a finite number`);
    assertValid(
      typeof value.unit === "string" && value.unit.length > 0,
      `${name}.unit must be a string`,
    );
    return;
  }
  if (type === "shadow") {
    const shadows = Array.isArray(value) ? value : [value];
    assertValid(shadows.length > 0, `${name} must contain at least one shadow`);
    for (const [index, shadow] of shadows.entries()) {
      const path = `${name}[${index}]`;
      assertValid(
        shadow && typeof shadow === "object" && !Array.isArray(shadow),
        `${path} must be an object`,
      );
      validateValue(shadow.color, "color", `${path}.color`);
      for (const property of ["offsetX", "offsetY", "blur", "spread"])
        validateValue(shadow[property], "dimension", `${path}.${property}`);
    }
  }
}

/** @brief 校验 DTCG 2025.10 令牌结构和所有引用 (Validate DTCG 2025.10 token structures and references). */
export function validateDocument(document) {
  assertValid(
    document && typeof document === "object" && !Array.isArray(document),
    "root must be an object",
  );
  const tokens = flatten(document);
  assertValid(tokens.size > 0, "document must contain at least one token");
  for (const [name, token] of tokens) {
    assertValid(typeof token.$type === "string", `${name} must declare or inherit $type`);
    validateValue(resolve(name, tokens), token.$type, name);
  }
  return tokens;
}

/** @brief 将数字稳定序列化为 CSS 片段 (Serialize a number to a stable CSS fragment). */
function formatNumber(value) {
  return Number(value.toFixed(8)).toString();
}

/** @brief 把 DTCG 2025.10 颜色对象序列化为 CSS (Serialize a DTCG 2025.10 color object as CSS). */
function colorToCss(value) {
  const alpha = value.alpha ?? 1;
  if (value.hex) {
    if (alpha === 1) return value.hex.toLowerCase();
    const alphaByte = Math.round(alpha * 255);
    if (Math.abs(alpha - alphaByte / 255) < 1e-12)
      return `${value.hex.toLowerCase()}${alphaByte.toString(16).padStart(2, "0")}`;
  }
  const components = value.components.map((component) =>
    component === "none" ? component : formatNumber(component),
  );
  const alphaSuffix = alpha === 1 ? "" : ` / ${formatNumber(alpha)}`;
  if (value.colorSpace === "hsl" || value.colorSpace === "hwb")
    return `${value.colorSpace}(${components[0]} ${components[1]}% ${components[2]}%${alphaSuffix})`;
  if (["lab", "lch", "oklab", "oklch"].includes(value.colorSpace))
    return `${value.colorSpace}(${components.join(" ")}${alphaSuffix})`;
  return `color(${value.colorSpace} ${components.join(" ")}${alphaSuffix})`;
}

/** @brief 把 DTCG 值序列化为 CSS 值 (Serialize a DTCG value as a CSS value). */
function toCss(value, type) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (type === "color" && value && typeof value === "object") return colorToCss(value);
  if (Array.isArray(value)) {
    if (type === "fontFamily")
      return value
        .map((item) => (/\s/.test(item) && !item.startsWith('"') ? `"${item}"` : item))
        .join(", ");
    if (type === "cubicBezier") return `cubic-bezier(${value.join(", ")})`;
    if (type === "shadow") return value.map((item) => toCss(item, type)).join(", ");
    return value.map((item) => toCss(item, type)).join(", ");
  }
  if (value && typeof value === "object" && "value" in value && "unit" in value)
    return `${value.value}${value.unit}`;
  if (type === "shadow" && value && typeof value === "object")
    return `${toCss(value.offsetX)} ${toCss(value.offsetY)} ${toCss(value.blur)} ${toCss(value.spread)} ${colorToCss(value.color)}`;
  throw new Error(`Unsupported ${type ?? "unknown"} token value: ${JSON.stringify(value)}`);
}

function variableName(name) {
  return `--moe-${name.replaceAll(".", "-")}`;
}

function semanticVariableName(name) {
  return `--moe-color-${name.split(".").slice(2).join("-")}`;
}

/** @brief 生成可直接消费的 CSS 令牌表 (Generate a directly consumable CSS token sheet). */
function renderTokenCss(tokens) {
  const common = [];
  const light = [];
  const dark = [];
  for (const [name, token] of tokens) {
    const cssValue = toCss(resolve(name, tokens), token.$type);
    if (name.startsWith("semantic.light."))
      light.push(`  ${semanticVariableName(name)}: ${cssValue};`);
    else if (name.startsWith("semantic.dark."))
      dark.push(`  ${semanticVariableName(name)}: ${cssValue};`);
    else common.push(`  ${variableName(name)}: ${cssValue};`);
  }
  const themeAliases = [
    "background",
    "background-end",
    "surface",
    "surface-strong",
    "surface-muted",
    "text",
    "text-soft",
    "heading",
    "accent",
    "accent-strong",
    "accent-wash",
    "on-accent",
    "border",
    "focus",
    "success",
    "danger",
    "neutral",
  ];
  return `@layer moe.tokens, moe.reset, moe.foundation, moe.components, moe.utilities;\n\n@layer moe.tokens {\n  :root {\n${common.join("\n")}\n${light.join("\n")}\n    color-scheme: light;\n  }\n\n  :root[data-moe-theme="dark"] {\n${dark.join("\n")}\n    color-scheme: dark;\n  }\n\n  @media (prefers-color-scheme: dark) {\n    :root:not([data-moe-theme]),\n    :root[data-moe-theme="auto"] {\n${dark.join("\n")}\n      color-scheme: dark;\n    }\n  }\n\n  :root {\n${themeAliases.map((name) => `    --moe-${name}: var(--moe-color-${name});`).join("\n")}\n  }\n}\n`;
}

/** @brief 生成稳定的 TypeScript 令牌 API (Generate the stable TypeScript token API). */
function renderTypeScript(tokens) {
  const resolved = Object.fromEntries(
    [...tokens].map(([name, token]) => [name, toCss(resolve(name, tokens), token.$type)]),
  );
  return `/** @brief 已解析设计令牌的只读映射 (Readonly map of resolved design tokens). */\n// biome-ignore format: 生成文件保持构建器的确定性输出 (Generated file keeps deterministic builder output).\nexport const tokens = ${JSON.stringify(resolved, null, 2)} as const;\n\n/** @brief 所有可用设计令牌名称 (All available design-token names). */\nexport const tokenNames = Object.freeze(Object.keys(tokens)) as readonly (keyof typeof tokens)[];\n\n/** @brief 有效设计令牌名称联合类型 (Union of valid design-token names). */\nexport type TokenName = keyof typeof tokens;\n`;
}

/** @brief 删除构建输出以防止陈旧文件进入发布包 (Remove build output so stale files cannot enter a release). */
export async function cleanOutput(outputRoot = defaultOutputRoot) {
  await rm(outputRoot, { recursive: true, force: true });
}

/** @brief 构建 CSS、JSON 与 TypeScript 设计令牌产物 (Build CSS, JSON, and TypeScript design-token artifacts). */
export async function buildTokens({
  outputRoot = defaultOutputRoot,
  generatedPath = defaultGeneratedPath,
} = {}) {
  const document = JSON.parse(await readFile(sourcePath, "utf8"));
  const flat = validateDocument(document);
  const css = renderTokenCss(flat);
  const resolved = Object.fromEntries(
    [...flat].map(([name, token]) => [
      name,
      { value: toCss(resolve(name, flat), token.$type), type: token.$type },
    ]),
  );
  const foundation = await readFile(join(packageRoot, "src", "styles", "foundation.css"), "utf8");
  const components = await readFile(join(packageRoot, "src", "styles", "components.css"), "utf8");
  await Promise.all([
    mkdir(join(outputRoot, "css"), { recursive: true }),
    mkdir(join(outputRoot, "tokens"), { recursive: true }),
    mkdir(dirname(generatedPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(outputRoot, "css", "tokens.css"), css),
    writeFile(join(outputRoot, "css", "foundation.css"), foundation),
    writeFile(join(outputRoot, "css", "components.css"), components),
    writeFile(join(outputRoot, "css", "all.css"), `${css}\n${foundation}\n${components}`),
    writeFile(join(outputRoot, "tokens", "tokens.json"), `${JSON.stringify(resolved, null, 2)}\n`),
    writeFile(
      join(outputRoot, "tokens", "tokens.dtcg.json"),
      `${JSON.stringify(document, null, 2)}\n`,
    ),
    writeFile(generatedPath, renderTypeScript(flat)),
  ]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes("--clean-only")) await cleanOutput();
  else {
    if (process.argv.includes("--clean")) await cleanOutput();
    await buildTokens();
  }
}
