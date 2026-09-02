/**
 * @file CDN 发布工具 / CDN release utilities.
 * @note 仅使用 Node.js 内建模块，以便在干净的 GitHub Actions 环境中运行。
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

/** @brief 清单格式版本 / Manifest schema version. */
export const SCHEMA_VERSION = 1;

/** @brief 允许发布的顶层目录 / Publishable top-level directories. */
export const RELEASE_DIRECTORIES = ["css", "tokens", "assets"];

/** @brief 扩展名到媒体类型的稳定映射 / Stable extension-to-media-type map. */
const MEDIA_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".otf", "font/otf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

/**
 * @brief 将系统路径转换为 URL 路径 / Convert a native path to a URL path.
 * @param {string} value 系统路径 / Native path.
 * @return {string} 使用正斜杠的路径 / Forward-slash path.
 */
export function toUrlPath(value) {
  return value.split(sep).join("/");
}

/**
 * @brief 递归列出目录中的普通文件 / Recursively list regular files.
 * @param {string} root 根目录 / Root directory.
 * @return {Promise<string[]>} 排序后的绝对路径 / Sorted absolute paths.
 */
export async function listFiles(root) {
  /** @brief 扫描结果 / Scan result. */
  const files = [];

  /**
   * @brief 扫描单个目录 / Scan one directory.
   * @param {string} directory 当前目录 / Current directory.
   * @return {Promise<void>} 完成信号 / Completion signal.
   */
  async function visit(directory) {
    /** @brief 已排序的目录项 / Sorted directory entries. */
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      /** @brief 当前目录项的绝对路径 / Absolute path of the current entry. */
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }

  await visit(root);
  return files;
}

/**
 * @brief 推断文件媒体类型 / Infer a file media type.
 * @param {string} path 文件路径 / File path.
 * @return {string} IANA 媒体类型 / IANA media type.
 */
export function mediaTypeFor(path) {
  return MEDIA_TYPES.get(extname(path).toLowerCase()) ?? "application/octet-stream";
}

/**
 * @brief 计算文件发布元数据 / Compute release metadata for a file.
 * @param {string} path 文件路径 / File path.
 * @param {string} releasePath 发布内相对路径 / Release-relative path.
 * @param {string} version 语义版本 / Semantic version.
 * @return {Promise<object>} 包含摘要和大小的元数据 / Metadata with digests and size.
 */
export async function describeFile(path, releasePath, version) {
  /** @brief 原始文件内容 / Raw file contents. */
  const contents = await readFile(path);
  /** @brief SHA-256 十六进制摘要 / SHA-256 hexadecimal digest. */
  const sha256 = createHash("sha256").update(contents).digest("hex");
  /** @brief SHA-384 子资源完整性值 / SHA-384 Subresource Integrity value. */
  const integrity = `sha384-${createHash("sha384").update(contents).digest("base64")}`;
  return {
    path: releasePath,
    url: `/v/${version}/${releasePath}`,
    sha256,
    integrity,
    bytes: contents.byteLength,
    mediaType: mediaTypeFor(path),
  };
}

/**
 * @brief 稳定序列化 JSON / Serialize JSON deterministically.
 * @param {unknown} value 待序列化值 / Value to serialize.
 * @return {string} 以换行结尾的 JSON / Newline-terminated JSON.
 */
export function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * @brief 读取并解析 JSON / Read and parse JSON.
 * @param {string} path JSON 文件路径 / JSON file path.
 * @return {Promise<any>} 解析结果 / Parsed result.
 */
export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

/**
 * @brief 判断语义版本是否为预发布版本 / Determine whether a semantic version is a prerelease.
 * @param {string} version 语义版本 / Semantic version.
 * @return {boolean} 含有预发布标识符时为真 / True when a prerelease identifier is present.
 */
export function isPrereleaseVersion(version) {
  return version.includes("-");
}

/**
 * @brief 发现全部主版本别名 / Discover every major-version alias.
 * @param {string} versionsRoot 包含版本目录的根目录 / Root containing version directories.
 * @return {Promise<Array<{alias:string,version:string,baseUrl:string}>>} 按数值排序的别名 / Numerically sorted aliases.
 * @note 纯数字目录是别名的事实来源；其 manifest 决定目标精确版本。
 *       Numeric directories are the source of truth; their manifest selects the exact version.
 */
export async function discoverMajorAliases(versionsRoot) {
  /** @brief 版本目录项 / Version directory entries. */
  const entries = await readdir(versionsRoot, { withFileTypes: true });
  /** @brief 发现的别名 / Discovered aliases. */
  const aliases = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    /** @brief 别名目录清单 / Alias-directory manifest. */
    const manifest = await readJson(resolve(versionsRoot, entry.name, "manifest.json"));
    if (
      typeof manifest.version !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version) ||
      isPrereleaseVersion(manifest.version) ||
      manifest.version.split(".")[0] !== entry.name
    ) {
      throw new Error(
        `主版本别名 ${entry.name} 的 manifest 版本无效 / Major alias manifest has an invalid version.`,
      );
    }
    aliases.push({ alias: entry.name, version: manifest.version, baseUrl: `/v/${entry.name}` });
  }
  aliases.sort((left, right) => {
    /** @brief 任意精度主版本比较结果 / Arbitrary-precision major comparison. */
    const numericOrder = BigInt(left.alias) - BigInt(right.alias);
    return numericOrder < 0n ? -1 : numericOrder > 0n ? 1 : left.alias.localeCompare(right.alias);
  });
  return aliases;
}

/**
 * @brief 判断路径是否为目录 / Determine whether a path is a directory.
 * @param {string} path 待检查路径 / Path to inspect.
 * @return {Promise<boolean>} 目录存在时为真 / True when a directory exists.
 */
export async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * @brief 取得根目录下的 URL 风格相对路径 / Get a URL-style relative path below a root.
 * @param {string} root 根目录 / Root directory.
 * @param {string} path 文件路径 / File path.
 * @return {string} 相对路径 / Relative path.
 */
export function relativeUrl(root, path) {
  return toUrlPath(relative(root, path));
}
