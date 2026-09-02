/**
 * @file 构建不可变 CDN 发布物并同步到 Astro public / Build immutable CDN releases and sync Astro public.
 */

import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeFile,
  isDirectory,
  jsonText,
  listFiles,
  RELEASE_DIRECTORIES,
  readJson,
  relativeUrl,
  SCHEMA_VERSION,
} from "./cdn-lib.mjs";

/** @brief 仓库根目录 / Repository root. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** @brief 库构建产物目录 / Library build output directory. */
const DIST = resolve(ROOT, "packages/style/dist");
/** @brief 持久发布物目录 / Persistent release directory. */
const RELEASES = resolve(ROOT, "static-releases");
/** @brief Astro 公共资源目录 / Astro public directory. */
const PUBLIC = resolve(ROOT, "pages/public");

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
    baseUrl: `/v/${packageJson.version}`,
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
    const source = await readFile(file.source);
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
      await cp(file.source, destination);
    }
    await writeFile(resolve(temporary, "manifest.json"), manifestText);
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

/**
 * @brief 以目录替换方式同步可变别名 / Sync a mutable alias by directory replacement.
 * @param {string} source 精确版本源目录 / Exact-version source directory.
 * @param {string} target 别名目标目录 / Alias destination directory.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function replaceDirectory(source, target) {
  /** @brief 同级临时目录 / Sibling temporary directory. */
  const temporary = `${target}.tmp-${randomUUID()}`;
  await rm(temporary, { recursive: true, force: true });
  await cp(source, temporary, { recursive: true });
  await rm(target, { recursive: true, force: true });
  await rename(temporary, target);
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
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`不支持的版本 ${version} / Unsupported semantic version.`);
  }
  /** @brief 主版本别名 / Major-version alias. */
  const major = version.split(".")[0];
  /** @brief 发布文件 / Release files. */
  const files = await inventory(version);
  /** @brief 精确版本清单 / Exact-version manifest. */
  const manifest = releaseManifest(packageJson, files);
  /** @brief 稳定清单文本 / Stable manifest text. */
  const manifestText = jsonText(manifest);
  /** @brief 精确版本目标 / Exact-version target. */
  const exact = resolve(RELEASES, "v", version);

  await mkdir(resolve(RELEASES, "v"), { recursive: true });
  if (!(await exactReleaseMatches(exact, files, manifestText))) {
    await createExactRelease(exact, files, manifestText);
  }
  await replaceDirectory(exact, resolve(RELEASES, "v", major));
  await replaceDirectory(exact, resolve(RELEASES, "v", "latest"));

  /** @brief 根发现清单 / Root discovery manifest. */
  const rootManifest = {
    ...manifest,
    aliases: {
      latest: version,
      [major]: version,
    },
    aliasBaseUrls: {
      latest: "/v/latest",
      [major]: `/v/${major}`,
    },
  };
  await writeFile(resolve(RELEASES, "manifest.json"), jsonText(rootManifest));

  await mkdir(PUBLIC, { recursive: true });
  await replaceDirectory(resolve(RELEASES, "v"), resolve(PUBLIC, "v"));
  await cp(resolve(RELEASES, "manifest.json"), resolve(PUBLIC, "manifest.json"));
  process.stdout.write(`CDN ${version}: ${files.length} files -> pages/public/v\n`);
}

await main();
