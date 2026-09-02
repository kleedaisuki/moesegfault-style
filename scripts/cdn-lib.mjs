/**
 * @file CDN 发布工具 / CDN release utilities.
 * @note 仅使用 Node.js 内建模块，以便在干净的 GitHub Actions 环境中运行。
 */

import { createHash, randomUUID } from "node:crypto";
import { cp, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import semver from "semver";

/** @brief 清单格式版本 / Manifest schema version. */
export const SCHEMA_VERSION = 1;

/** @brief 允许发布的顶层目录 / Publishable top-level directories. */
export const RELEASE_DIRECTORIES = ["css", "tokens", "assets"];

/** @brief 扩展名到媒体类型的稳定映射 / Stable extension-to-media-type map. */
const MEDIA_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
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
  return describeContents(await readFile(path), releasePath, version);
}

/**
 * @brief 计算内存内容的发布元数据 / Compute release metadata for in-memory contents.
 * @param {Uint8Array|string} value 原始内容 / Raw contents.
 * @param {string} releasePath 发布内相对路径 / Release-relative path.
 * @param {string} version 语义版本 / Semantic version.
 * @return {object} 包含摘要和大小的元数据 / Metadata with digests and size.
 */
export function describeContents(value, releasePath, version) {
  /** @brief 统一的二进制内容 / Normalized binary contents. */
  const contents = Buffer.isBuffer(value) ? value : Buffer.from(value);
  /** @brief SHA-256 十六进制摘要 / SHA-256 hexadecimal digest. */
  const sha256 = createHash("sha256").update(contents).digest("hex");
  /** @brief SHA-384 子资源完整性值 / SHA-384 Subresource Integrity value. */
  const integrity = `sha384-${createHash("sha384").update(contents).digest("base64")}`;
  return {
    path: releasePath,
    url: `/v${version}/${releasePath}`,
    sha256,
    integrity,
    bytes: contents.byteLength,
    mediaType: mediaTypeFor(releasePath),
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
  return semver.prerelease(version) !== null;
}

/**
 * @brief 判断字符串是否为严格语义版本 / Determine whether a string is a strict semantic version.
 * @param {string} version 候选版本 / Candidate version.
 * @return {boolean} 严格有效时为真 / True when strictly valid.
 */
export function isValidVersion(version) {
  /** @brief node-semver 解析结果 / Parsed node-semver value. */
  const parsed = semver.parse(version);
  if (!parsed) return false;
  /** @brief 含构建元数据的规范字符串 / Canonical text including build metadata. */
  const canonical = `${parsed.version}${parsed.build.length > 0 ? `+${parsed.build.join(".")}` : ""}`;
  return canonical === version;
}

/**
 * @brief 按 SemVer 优先级和规范字符串比较版本 / Compare by SemVer precedence and canonical text.
 * @param {string} left 左版本 / Left version.
 * @param {string} right 右版本 / Right version.
 * @return {number} 确定性的负数、零或正数 / Deterministic negative, zero, or positive.
 * @note 构建元数据不影响 SemVer 优先级；规范字符串作为跨平台稳定的最终裁决。
 *       Build metadata does not affect SemVer precedence; canonical text is a stable tie-breaker.
 */
export function compareVersions(left, right) {
  /** @brief SemVer 规定的优先级比较 / Precedence comparison defined by SemVer. */
  const precedence = semver.compare(left, right);
  if (precedence !== 0) return precedence;
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * @brief 从规范目录名提取精确版本 / Extract an exact version from a canonical directory name.
 * @param {string} name 顶层目录名 / Top-level directory name.
 * @return {string|null} 版本或空值 / Version or null.
 */
export function versionFromExactDirectory(name) {
  if (!name.startsWith("v")) return null;
  /** @brief 去除 v 前缀的候选版本 / Candidate version without the v prefix. */
  const version = name.slice(1);
  return isValidVersion(version) ? version : null;
}

/**
 * @brief 选择最大稳定精确版本 / Select the greatest stable exact release.
 * @param {Array<{version:string}>} releases 已发布版本 / Published releases.
 * @return {{version:string}|null} 最大稳定版本或空值 / Greatest stable release or null.
 */
export function latestStableRelease(releases) {
  return (
    releases
      .filter(({ version }) => !isPrereleaseVersion(version))
      .reduce(
        (latest, candidate) =>
          !latest || compareVersions(candidate.version, latest.version) > 0 ? candidate : latest,
        null,
      ) ?? null
  );
}

/**
 * @brief 发现全部规范精确版本 / Discover every canonical exact release.
 * @param {string} versionsRoot 包含版本目录的根目录 / Root containing version directories.
 * @return {Promise<Array<{version:string,baseUrl:string,manifestUrl:string}>>} 排序后的版本描述 / Sorted release descriptors.
 * @note 仅 vX.Y.Z 目录属于发布集合；latest 和默认资源均不是独立版本。
 *       Only vX.Y.Z directories belong to the release set; latest and defaults are not releases.
 */
export async function discoverExactReleases(versionsRoot) {
  /** @brief 版本目录项 / Version directory entries. */
  const entries = await readdir(versionsRoot, { withFileTypes: true });
  /** @brief 发现的精确版本 / Discovered exact releases. */
  const releases = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    /** @brief 目录名携带的严格版本 / Strict version encoded by the directory name. */
    const version = versionFromExactDirectory(entry.name);
    if (!version) {
      if (/^v\d+\./.test(entry.name)) {
        throw new Error(`非法精确版本目录 ${entry.name} / Invalid exact-release directory.`);
      }
      continue;
    }
    /** @brief 精确版本清单 / Exact-release manifest. */
    const manifest = await readJson(resolve(versionsRoot, entry.name, "manifest.json"));
    if (manifest.version !== version || manifest.baseUrl !== `/${entry.name}`) {
      throw new Error(
        `精确版本 ${entry.name} 的 manifest 无效 / Exact release has an invalid manifest.`,
      );
    }
    releases.push({
      version: manifest.version,
      baseUrl: `/${entry.name}`,
      manifestUrl: `/${entry.name}/manifest.json`,
    });
  }
  releases.sort((left, right) => compareVersions(left.version, right.version));
  return releases;
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
 * @brief 以可回滚事务替换可变目录 / Replace a mutable directory transactionally with rollback.
 * @param {string} source 精确版本源目录 / Exact-version source directory.
 * @param {string} target 可变别名目标目录 / Mutable alias destination directory.
 * @param {{renamePath?:(source:string,target:string)=>Promise<void>}} [options] 测试注入选项 / Test injection options.
 * @return {Promise<void>} 完成信号 / Completion signal.
 * @note 目标先改名为同级备份；若新目录切换失败，则恢复最后一个良好版本。
 *       The target is first renamed to a sibling backup; a failed swap restores the last good version.
 */
export async function replaceDirectory(source, target, options = {}) {
  /** @brief 可注入的重命名操作 / Injectable rename operation. */
  const renamePath = options.renamePath ?? rename;
  /** @brief 同级暂存目录 / Sibling staging directory. */
  const temporary = `${target}.tmp-${randomUUID()}`;
  /** @brief 同级回滚备份 / Sibling rollback backup. */
  const backup = `${target}.backup-${randomUUID()}`;
  /** @brief Windows 友好的清理选项 / Windows-friendly cleanup options. */
  const cleanup = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 };
  /** @brief 是否已经创建目标备份 / Whether the target backup has been created. */
  let backedUp = false;

  await rm(temporary, cleanup);
  await rm(backup, cleanup);
  try {
    await cp(source, temporary, { recursive: true });
    if (await isDirectory(target)) {
      await renamePath(target, backup);
      backedUp = true;
    }
    await renamePath(temporary, target);
    if (backedUp) await rm(backup, cleanup);
  } catch (error) {
    /** @brief 回滚期间出现的错误 / Error raised while rolling back. */
    let rollbackError;
    try {
      await rm(temporary, cleanup);
      if (backedUp) {
        if (await isDirectory(target)) await rm(target, cleanup);
        await renamePath(backup, target);
        backedUp = false;
      }
    } catch (caught) {
      rollbackError = caught;
    }
    if (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        `目录替换和回滚均失败；备份保留在 ${backup} / Directory replacement and rollback both failed; backup retained.`,
      );
    }
    throw error;
  } finally {
    await rm(temporary, cleanup);
    if (!backedUp) await rm(backup, cleanup);
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
