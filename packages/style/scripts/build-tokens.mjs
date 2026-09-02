import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(packageRoot, "tokens", "tokens.dtcg.json");
const outputRoot = join(packageRoot, "dist");

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

/** @brief 解析令牌引用并检测循环引用 (Resolve token references and detect reference cycles). */
function resolve(name, tokens, stack = []) {
  if (stack.includes(name))
    throw new Error(`Circular token reference: ${[...stack, name].join(" -> ")}`);
  const token = tokens.get(name);
  if (!token) throw new Error(`Unknown token reference: ${name}`);
  if (typeof token.$value === "string") {
    const exact = token.$value.match(/^\{([^}]+)\}$/);
    if (exact) return resolve(exact[1], tokens, [...stack, name]);
  }
  return token.$value;
}

/** @brief 把 DTCG 值序列化为 CSS 值 (Serialize a DTCG value as a CSS value). */
function toCss(value, type) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (type === "fontFamily")
      return value
        .map((item) => (/\s/.test(item) && !item.startsWith('"') ? `"${item}"` : item))
        .join(", ");
    if (type === "cubicBezier") return `cubic-bezier(${value.join(", ")})`;
    return value.map((item) => toCss(item, type)).join(", ");
  }
  if (value && typeof value === "object" && "value" in value && "unit" in value)
    return `${value.value}${value.unit}`;
  if (type === "shadow" && value && typeof value === "object") {
    return `${toCss(value.offsetX)} ${toCss(value.offsetY)} ${toCss(value.blur)} ${toCss(value.spread)} ${value.color}`;
  }
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

/** @brief 构建 CSS、JSON 与 TypeScript 设计令牌产物 (Build CSS, JSON, and TypeScript design-token artifacts). */
export async function buildTokens() {
  const document = JSON.parse(await readFile(sourcePath, "utf8"));
  const flat = flatten(document);
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
    writeFile(join(packageRoot, "src", "tokens.generated.ts"), renderTypeScript(flat)),
  ]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildTokens();
}
