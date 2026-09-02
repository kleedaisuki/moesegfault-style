import { execFileSync } from "node:child_process";

/** @brief Git 比较基线 / Git comparison base. */
const base = process.argv[2];
/** @brief 全零提交标识检测器 / All-zero commit identifier matcher. */
const zeroSha = /^0+$/;

if (!base) {
  console.error("A Git comparison base is required to protect immutable releases.");
  process.exit(1);
}

if (zeroSha.test(base)) {
  console.log("Initial repository push detected; no release history exists to compare.");
  process.exit(0);
}

/** @brief Git 名称状态差异 / Git name-status diff. */
let output;
try {
  output = execFileSync(
    "git",
    ["diff", "--name-status", `${base}...HEAD`, "--", "static-releases"],
    {
      encoding: "utf8",
    },
  );
} catch (error) {
  console.error(`Unable to compare immutable releases against ${base}.`);
  throw error;
}

/** @brief 精确语义版本发布路径检测器 / Exact semantic-version release path matcher. */
const exactRelease =
  /^(static-releases\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\//;
/** @brief 不可变发布违规项 / Immutable release violations. */
const violations = [];
/** @brief 基线中已存在的精确版本目录缓存 / Cache of exact-version directories present at the base. */
const existedAtBase = new Map();

for (const line of output.trim().split("\n")) {
  if (!line) continue;
  /** @brief 当前 Git 状态与路径 / Current Git status and paths. */
  const [status, ...paths] = line.split("\t");
  for (const path of paths) {
    /** @brief 当前路径的精确版本目录匹配 / Exact-version directory match for the current path. */
    const match = path.match(exactRelease);
    if (!match) continue;
    /** @brief 当前精确版本目录 / Current exact-version directory. */
    const releaseRoot = match[1];
    if (!existedAtBase.has(releaseRoot)) {
      try {
        execFileSync("git", ["cat-file", "-e", `${base}:${releaseRoot}`], { stdio: "ignore" });
        existedAtBase.set(releaseRoot, true);
      } catch {
        existedAtBase.set(releaseRoot, false);
      }
    }
    /** @brief 新目录可由新增、复制或重命名首次引入 / A new release may first appear via add, copy, or rename. */
    const introducesNewPath = /^[ACR]/.test(status);
    if (!introducesNewPath || existedAtBase.get(releaseRoot)) violations.push(`${status}\t${path}`);
  }
}

if (violations.length > 0) {
  console.error(
    "Published exact-version assets are immutable. Create a new package version instead:",
  );
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(`Exact-version release history is immutable relative to ${base}.`);
