/**
 * @file 构建不可变 CDN 发布物并同步到 Astro public / Build immutable CDN releases and sync Astro public.
 */

import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeContents,
  describeFile,
  discoverExactReleases,
  isDirectory,
  isValidVersion,
  jsonText,
  listFiles,
  latestStableRelease,
  RELEASE_DIRECTORIES,
  readJson,
  replaceDirectory,
  relativeUrl,
  SCHEMA_VERSION,
  versionFromExactDirectory,
} from "./cdn-lib.mjs";

/** @brief 仓库根目录 / Repository root. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** @brief 库构建产物目录 / Library build output directory. */
const DIST = resolve(ROOT, "packages/style/dist");
/** @brief 持久发布物目录 / Persistent release directory. */
const RELEASES = resolve(ROOT, "static-releases");
/** @brief Astro 公共资源目录 / Astro public directory. */
const PUBLIC = resolve(ROOT, "pages/public");
/** @brief 根发现清单格式版本 / Root discovery-manifest schema version. */
const ROOT_SCHEMA_VERSION = 2;

/**
 * @brief 生成待发布文件清单 / Build the publishable file inventory.
 * @param {string} version 库版本 / Library version.
 * @return {Promise<Array<{source:string,path:string,metadata:object}>>} 文件清单 / File inventory.
 */
async function inventory(version) {
  /** @brief 待发布文件清单 / Publishable inventory. */
  const result = [];
  for (const directory of RELEASE_DIRECTORIES) {
    /** @brief 当前源目录 / Current source directory. */
    const sourceRoot = resolve(DIST, directory);
    if (!(await isDirectory(sourceRoot))) continue;
    for (const source of await listFiles(sourceRoot)) {
      /** @brief 发布内相对路径 / Release-relative path. */
      const path = `${directory}/${relativeUrl(sourceRoot, source)}`;
      result.push({ source, path, metadata: await describeFile(source, path, version) });
    }
  }
  /** @brief 精确版本的可导航入口 / Navigable exact-version landing page. */
  const versionIndex = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>MoeSegFault Style ${version}</title><link rel="stylesheet" href="css/all.css"></head>
<body class="moe-surface"><main class="moe-container moe-stack" style="padding-block:var(--moe-space-8)">
<p class="moe-badge">v${version}</p><h1>MoeSegFault Style 静态资源 / Static assets</h1>
<p>此目录固定为不可变版本 v${version}。This directory is pinned to immutable version v${version}.</p>
<ul><li><a href="manifest.json">发布清单 / Release manifest</a></li><li><a href="colors/">颜色资源 / Color resources</a></li><li><a href="css/all.css">完整样式 / Complete stylesheet</a></li><li><a href="tokens/tokens.json">设计令牌 / Design tokens</a></li></ul>
</main></body></html>
`;
  result.push({
    contents: Buffer.from(versionIndex),
    path: "index.html",
    metadata: describeContents(versionIndex, "index.html", version),
  });
  /** @brief 精确版本的可导航颜色索引 / Navigable exact-version color index. */
  const colorIndex = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>MoeSegFault Colors ${version}</title><link rel="stylesheet" href="../css/all.css"></head>
<body class="moe-surface"><main class="moe-container moe-stack" style="padding-block:var(--moe-space-8)">
<p class="moe-badge">v${version}</p><h1>颜色资源 / Color resources</h1>
<p>此页面固定指向版本 v${version}。This page is pinned to version v${version}.</p>
<ul><li><a href="colors.css">CSS 颜色令牌 / CSS color tokens</a></li><li><a href="colors.json">JSON 设计令牌 / JSON design tokens</a></li><li><a href="../manifest.json">发布清单 / Release manifest</a></li></ul>
</main></body></html>
`;
  result.push({
    contents: Buffer.from(colorIndex),
    path: "colors/index.html",
    metadata: describeContents(colorIndex, "colors/index.html", version),
  });
  /** @brief 为颜色命名空间提供的机器资源 / Machine resources in the color namespace. */
  const tokenCss = result.find((file) => file.path === "css/tokens.css");
  const tokenJson = result.find((file) => file.path === "tokens/tokens.json");
  if (!tokenCss || !tokenJson) {
    throw new Error("缺少颜色令牌构建产物 / Missing built color-token assets.");
  }
  result.push({
    source: tokenCss.source,
    path: "colors/colors.css",
    metadata: await describeFile(tokenCss.source, "colors/colors.css", version),
  });
  result.push({
    source: tokenJson.source,
    path: "colors/colors.json",
    metadata: await describeFile(tokenJson.source, "colors/colors.json", version),
  });
  result.sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (result.length === 0) {
    throw new Error(
      `没有可发布文件。请先构建 ${DIST} / No publishable files; build the library first.`,
    );
  }
  return result;
}

/**
 * @brief 构造确定性的版本清单 / Construct a deterministic version manifest.
 * @param {object} packageJson 库 package.json / Library package.json.
 * @param {Array<{metadata:object}>} files 文件清单 / File inventory.
 * @return {object} 版本清单 / Version manifest.
 */
function releaseManifest(packageJson, files) {
  return {
    schemaVersion: SCHEMA_VERSION,
    package: packageJson.name,
    version: packageJson.version,
    baseUrl: `/v${packageJson.version}`,
    files: files.map((file) => file.metadata),
  };
}

/**
 * @brief 比较已发布精确版本，阻止静默覆盖 / Compare an exact release and prevent silent overwrite.
 * @param {string} target 精确版本目录 / Exact-version directory.
 * @param {Array<{source:string,path:string}>} files 期望文件 / Expected files.
 * @param {string} manifestText 期望清单文本 / Expected manifest text.
 * @return {Promise<boolean>} 已存在且完全相同时为真 / True when already present and identical.
 */
async function exactReleaseMatches(target, files, manifestText) {
  if (!(await isDirectory(target))) return false;
  /** @brief 预期的相对文件名 / Expected relative file names. */
  const expectedPaths = [...files.map((file) => file.path), "manifest.json"].sort();
  /** @brief 已存在的相对文件名 / Existing relative file names. */
  const actualPaths = (await listFiles(target)).map((path) => relativeUrl(target, path)).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)) {
    throw new Error(
      `精确版本 ${target} 已存在且文件集合不同，拒绝覆盖 / Exact release has a different file set.`,
    );
  }
  for (const file of files) {
    /** @brief 源文件内容 / Source contents. */
    const source = file.contents ?? (await readFile(file.source));
    /** @brief 已发布文件内容 / Published contents. */
    const published = await readFile(resolve(target, file.path));
    if (!source.equals(published)) {
      throw new Error(`精确版本文件 ${file.path} 内容不同，拒绝覆盖 / Exact release file differs.`);
    }
  }
  if ((await readFile(resolve(target, "manifest.json"), "utf8")) !== manifestText) {
    throw new Error(`精确版本 manifest.json 内容不同，拒绝覆盖 / Exact release manifest differs.`);
  }
  return true;
}

/**
 * @brief 原子地首次写入精确版本 / Atomically write an exact version for the first time.
 * @param {string} target 精确版本目录 / Exact-version directory.
 * @param {Array<{source:string,path:string}>} files 发布文件 / Release files.
 * @param {string} manifestText 清单文本 / Manifest text.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function createExactRelease(target, files, manifestText) {
  /** @brief 同级临时目录 / Sibling temporary directory. */
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    for (const file of files) {
      /** @brief 临时目标文件 / Temporary destination file. */
      const destination = resolve(temporary, file.path);
      await mkdir(dirname(destination), { recursive: true });
      if (file.contents) await writeFile(destination, file.contents);
      else await cp(file.source, destination);
    }
    await writeFile(resolve(temporary, "manifest.json"), manifestText);
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

/**
 * @brief 写入 GitHub Pages 可执行的客户端跳转页 / Write a client redirect that works on GitHub Pages.
 * @param {string} target 输出文件 / Output file.
 * @param {string} destination 规范目标 URL / Canonical destination URL.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function writeRedirect(target, destination) {
  /** @brief HTML 属性与脚本安全使用的目标字符串 / Destination safe for HTML and script use. */
  const encoded = JSON.stringify(destination);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=${destination}"><link rel="canonical" href="${destination}"><title>正在跳转 / Redirecting</title><script>location.replace(${encoded}+location.search+location.hash)</script></head><body><p>正在前往 <a href="${destination}">${destination}</a> / Redirecting…</p></body></html>\n`,
  );
}

/**
 * @brief 移除未发布的旧嵌套路径和主版本别名 / Remove unpublished legacy nesting and major aliases.
 * @param {string} root 发布树根目录 / Release-tree root.
 * @return {Promise<void>} 完成信号 / Completion signal.
 * @note 精确版本 vX.Y.Z 不匹配此规则，因而不会被删除。
 *       Exact vX.Y.Z releases do not match this rule and are never removed.
 */
async function removeObsoleteVersionDirectories(root) {
  if (!(await isDirectory(root))) return;
  /** @brief Windows 友好的清理选项 / Windows-friendly cleanup options. */
  const cleanup = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 };
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && (entry.name === "v" || /^v\d+$/.test(entry.name))) {
      await rm(resolve(root, entry.name), cleanup);
    }
  }
}

/**
 * @brief 删除 Pages 中没有发布源的孤儿精确版本 / Remove public exact releases with no release source.
 * @param {string} sourceRoot 持久发布树 / Persistent release tree.
 * @param {string} publicRoot Pages 公共树 / Pages public tree.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function removeOrphanPublicReleases(sourceRoot, publicRoot) {
  if (!(await isDirectory(publicRoot))) return;
  /** @brief 受信任的精确版本目录名 / Trusted exact-release directory names. */
  const sourceNames = new Set(
    (await readdir(sourceRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && versionFromExactDirectory(entry.name))
      .map((entry) => entry.name),
  );
  /** @brief Windows 友好的清理选项 / Windows-friendly cleanup options. */
  const cleanup = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 };
  for (const entry of await readdir(publicRoot, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      /^v\d+\./.test(entry.name) &&
      (!versionFromExactDirectory(entry.name) || !sourceNames.has(entry.name))
    ) {
      await rm(resolve(publicRoot, entry.name), cleanup);
    }
  }
}

/**
 * @brief 将持久发布树镜像进 Astro public 且保留站点文件 / Mirror release entries into Astro public.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function mirrorPublic() {
  await removeObsoleteVersionDirectories(PUBLIC);
  await removeOrphanPublicReleases(RELEASES, PUBLIC);
  /** @brief 可变分发目录名 / Mutable distribution directory names. */
  const mutableNames = new Set(["latest", "css", "tokens", "colors"]);
  for (const entry of await readdir(RELEASES, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      (versionFromExactDirectory(entry.name) || mutableNames.has(entry.name))
    ) {
      await replaceDirectory(resolve(RELEASES, entry.name), resolve(PUBLIC, entry.name));
    }
  }
  await cp(resolve(RELEASES, "manifest.json"), resolve(PUBLIC, "manifest.json"));
}

/**
 * @brief 执行 CDN 构建 / Run the CDN build.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function main() {
  /** @brief 库包元数据 / Library package metadata. */
  const packageJson = await readJson(resolve(ROOT, "packages/style/package.json"));
  /** @brief 语义版本 / Semantic version. */
  const version = packageJson.version;
  if (!isValidVersion(version)) {
    throw new Error(`不支持的版本 ${version} / Unsupported semantic version.`);
  }
  /** @brief 发布文件 / Release files. */
  const files = await inventory(version);
  /** @brief 精确版本清单 / Exact-version manifest. */
  const manifest = releaseManifest(packageJson, files);
  /** @brief 稳定清单文本 / Stable manifest text. */
  const manifestText = jsonText(manifest);
  /** @brief 精确版本目标 / Exact-version target. */
  const exactName = `v${version}`;
  /** @brief 精确版本目标 / Exact-version target. */
  const exact = resolve(RELEASES, exactName);

  await mkdir(RELEASES, { recursive: true });
  await removeObsoleteVersionDirectories(RELEASES);
  if (!(await exactReleaseMatches(exact, files, manifestText))) {
    await createExactRelease(exact, files, manifestText);
  }
  /** @brief 全部已发布精确版本 / Every published exact release. */
  const publishedVersions = await discoverExactReleases(RELEASES);
  /** @brief 最大稳定版本描述 / Greatest stable release descriptor. */
  const latestRelease = latestStableRelease(publishedVersions);
  if (!latestRelease) {
    throw new Error(
      "至少需要一个稳定版本才能生成 latest / At least one stable release is required.",
    );
  }
  /** @brief 最大稳定语义版本 / Greatest stable semantic version. */
  const latestVersion = latestRelease.version;
  /** @brief 最大稳定版本目录名 / Greatest stable release directory name. */
  const latestName = `v${latestVersion}`;
  /** @brief 最大稳定版本目录 / Greatest stable release directory. */
  const latestExact = resolve(RELEASES, latestName);
  await replaceDirectory(latestExact, resolve(RELEASES, "latest"));
  await writeRedirect(resolve(RELEASES, "latest", "index.html"), `/${latestName}/`);
  await replaceDirectory(resolve(latestExact, "css"), resolve(RELEASES, "css"));
  await replaceDirectory(resolve(latestExact, "tokens"), resolve(RELEASES, "tokens"));
  await replaceDirectory(resolve(latestExact, "colors"), resolve(RELEASES, "colors"));
  await writeRedirect(resolve(RELEASES, "colors", "index.html"), `/${latestName}/colors/`);
  /** @brief 根发现清单 / Root discovery manifest. */
  const rootManifest = {
    schemaVersion: ROOT_SCHEMA_VERSION,
    package: packageJson.name,
    publishedVersions,
    latestVersion,
    latestBaseUrl: "/latest",
    defaultVersion: latestVersion,
    defaultResources: {
      styles: "/css/all.css",
      colors: "/colors/",
      colorsCss: "/colors/colors.css",
      colorsJson: "/colors/colors.json",
      tokensJson: "/tokens/tokens.json",
    },
  };
  await writeFile(resolve(RELEASES, "manifest.json"), jsonText(rootManifest));

  await mkdir(PUBLIC, { recursive: true });
  await mirrorPublic();
  process.stdout.write(`CDN v${version}: ${files.length} files -> pages/public\n`);
}

await main();
