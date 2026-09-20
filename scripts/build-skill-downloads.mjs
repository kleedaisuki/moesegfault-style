/**
 * @file 从仓库技能源构建可校验的静态下载资源 / Build verifiable static downloads from repository skill sources.
 *
 * The generated tree is disposable: `skills/` remains the single source of truth, while
 * `pages/public/skills/` is replaced atomically for static-site publication.
 */

import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { replaceDirectory } from "./cdn-lib.mjs";

/** @brief 仓库根目录 / Repository root. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** @brief 默认技能源目录 / Default skill source directory. */
const DEFAULT_SOURCE = resolve(ROOT, "skills");
/** @brief 默认静态输出目录 / Default static output directory. */
const DEFAULT_OUTPUT = resolve(ROOT, "pages/public/skills");
/** @brief 静态资源清单格式版本 / Static asset manifest schema version. */
const SCHEMA_VERSION = 1;

/**
 * @brief 计算 SHA-256 十六进制摘要 / Compute a hexadecimal SHA-256 digest.
 * @param {Uint8Array|string} value 输入内容 / Input contents.
 * @return {string} 小写十六进制摘要 / Lower-case hexadecimal digest.
 */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * @brief 将本地相对路径转换为 URL 路径 / Convert a local relative path to a URL path.
 * @param {string} root 根目录 / Root directory.
 * @param {string} path 文件路径 / File path.
 * @return {string} 正斜杠相对路径 / Slash-separated relative path.
 */
function relativeUrl(root, path) {
  return relative(root, path).split(sep).join("/");
}

/**
 * @brief 按 UTF-8 字节稳定排序路径 / Sort paths stably by UTF-8 bytes.
 * @param {string} left 左路径 / Left path.
 * @param {string} right 右路径 / Right path.
 * @return {number} 排序比较值 / Sort comparison value.
 */
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

/**
 * @brief 递归枚举普通文件并拒绝链接 / Recursively list regular files and reject links.
 * @param {string} root 技能根目录 / Skill root.
 * @param {string} [directory] 当前目录 / Current directory.
 * @return {Promise<string[]>} 稳定排序的文件列表 / Stably sorted file list.
 */
async function listSkillFiles(root, directory = root) {
  /** @brief 已发现文件 / Discovered files. */
  const files = [];
  /** @brief 稳定排序的目录项 / Stably sorted directory entries. */
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    compareUtf8(left.name, right.name),
  );
  for (const entry of entries) {
    /** @brief 当前条目路径 / Current entry path. */
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `技能不能包含符号链接：${relativeUrl(root, path)} / Skills cannot contain symlinks.`,
      );
    }
    if (entry.isDirectory()) files.push(...(await listSkillFiles(root, path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`不支持的技能条目：${relativeUrl(root, path)} / Unsupported skill entry.`);
  }
  return files;
}

/** @brief ZIP CRC-32 查找表 / ZIP CRC-32 lookup table. */
const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

/**
 * @brief 计算 ZIP CRC-32 / Compute ZIP CRC-32.
 * @param {Uint8Array} value 文件内容 / File contents.
 * @return {number} 无符号 CRC-32 / Unsigned CRC-32.
 */
function crc32(value) {
  let checksum = 0xffffffff;
  for (const byte of value) checksum = (checksum >>> 8) ^ CRC32_TABLE[(checksum ^ byte) & 0xff];
  return (checksum ^ 0xffffffff) >>> 0;
}

/**
 * @brief 构建确定性无压缩 ZIP / Build a deterministic stored ZIP archive.
 * @param {Array<{path:string,contents:Buffer}>} files 归档文件 / Archive files.
 * @return {Buffer} ZIP 内容 / ZIP contents.
 * @note 固定时间戳与排序使相同源得到逐字节相同的归档。Fixed timestamps and ordering make builds reproducible.
 */
export function createDeterministicZip(files) {
  /** @brief 本地文件记录 / Local file records. */
  const localRecords = [];
  /** @brief 中央目录记录 / Central directory records. */
  const centralRecords = [];
  let offset = 0;

  for (const file of [...files].sort((left, right) => compareUtf8(left.path, right.path))) {
    /** @brief UTF-8 文件名 / UTF-8 file name. */
    const name = Buffer.from(file.path, "utf8");
    /** @brief 文件正文 / File payload. */
    const contents = Buffer.from(file.contents);
    /** @brief CRC-32 校验值 / CRC-32 checksum. */
    const checksum = crc32(contents);
    /** @brief 本地文件头 / Local file header. */
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12); // 1980-01-01 00:00:00, the earliest DOS ZIP timestamp.
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(contents.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(name.length, 26);
    localRecords.push(local, name, contents);

    /** @brief 中央目录头 / Central directory header. */
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(contents.length, 20);
    central.writeUInt32LE(contents.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralRecords.push(central, name);
    offset += local.length + name.length + contents.length;
  }

  /** @brief 中央目录正文 / Central directory body. */
  const centralDirectory = Buffer.concat(centralRecords);
  /** @brief ZIP 结束记录 / ZIP end-of-central-directory record. */
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localRecords, centralDirectory, end]);
}

/**
 * @brief 发现技能源目录 / Discover skill source directories.
 * @param {string} sourceRoot 技能源根目录 / Skill source root.
 * @return {Promise<Array<{name:string,root:string}>>} 已排序技能列表 / Sorted skill list.
 */
async function discoverSkills(sourceRoot) {
  /** @brief 已发现技能 / Discovered skills. */
  const skills = [];
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
      throw new Error(`非法技能目录名 ${entry.name} / Invalid skill directory name.`);
    }
    /** @brief 技能根目录 / Skill root. */
    const root = resolve(sourceRoot, entry.name);
    try {
      await readFile(resolve(root, "SKILL.md"));
    } catch {
      throw new Error(`技能 ${entry.name} 缺少 SKILL.md / Skill is missing SKILL.md.`);
    }
    skills.push({ name: entry.name, root });
  }
  skills.sort((left, right) => compareUtf8(left.name, right.name));
  if (skills.length === 0) throw new Error("未发现技能 / No skills found.");
  return skills;
}

/**
 * @brief 构建全部技能的静态下载树 / Build the static download tree for all skills.
 * @param {{sourceRoot?:string,outputRoot?:string,publicBase?:string}} [options] 构建选项 / Build options.
 * @return {Promise<object>} 根清单 / Root manifest.
 */
export async function buildSkillDownloads(options = {}) {
  /** @brief 技能源目录 / Skill source directory. */
  const sourceRoot = resolve(options.sourceRoot ?? DEFAULT_SOURCE);
  /** @brief 静态输出目录 / Static output directory. */
  const outputRoot = resolve(options.outputRoot ?? DEFAULT_OUTPUT);
  /** @brief 不带尾斜杠的公开 URL 根 / Public URL root without trailing slash. */
  const publicBase = `/${(options.publicBase ?? "skills").replace(/^\/+|\/+$/g, "")}`;
  /** @brief 同级暂存目录 / Sibling staging directory. */
  const staging = `${outputRoot}.stage-${randomUUID()}`;
  /** @brief 根清单 / Root manifest. */
  const rootManifest = { schemaVersion: SCHEMA_VERSION, skills: [] };

  try {
    await mkdir(staging, { recursive: true });
    for (const skill of await discoverSkills(sourceRoot)) {
      /** @brief 技能输出目录 / Skill output directory. */
      const destination = resolve(staging, skill.name);
      await mkdir(destination, { recursive: true });
      /** @brief 技能源文件 / Skill source files. */
      const sourceFiles = await listSkillFiles(skill.root);
      /** @brief 读取后的归档文件 / Loaded archive files. */
      const archiveFiles = [];
      /** @brief 可校验的源文件元数据 / Verifiable source-file metadata. */
      const files = [];
      for (const source of sourceFiles) {
        /** @brief 技能内相对路径 / Skill-relative path. */
        const path = relativeUrl(skill.root, source);
        /** @brief 源文件内容 / Source file contents. */
        const contents = await readFile(source);
        archiveFiles.push({ path: `${skill.name}/${path}`, contents });
        files.push({
          path,
          url: `${publicBase}/${skill.name}/${path}`,
          size: contents.length,
          sha256: sha256(contents),
        });
        await mkdir(dirname(resolve(destination, path)), { recursive: true });
        await cp(source, resolve(destination, path));
      }
      /** @brief 确定性技能归档 / Deterministic skill archive. */
      const archive = createDeterministicZip(archiveFiles);
      /** @brief 归档文件名 / Archive file name. */
      const archiveName = `${skill.name}.zip`;
      /** @brief 归档摘要 / Archive digest. */
      const archiveSha256 = sha256(archive);
      await writeFile(resolve(staging, archiveName), archive);
      await writeFile(
        resolve(staging, `${archiveName}.sha256`),
        `${archiveSha256}  ${archiveName}\n`,
      );
      /** @brief 与传输格式无关的技能源版本 / Transport-independent skill source version. */
      const sourceVersion = sha256(files.map((file) => `${file.path}\0${file.sha256}\n`).join(""));
      rootManifest.skills.push({
        name: skill.name,
        sourceVersion,
        entrypoint: `${publicBase}/${skill.name}/SKILL.md`,
        files,
        archive: {
          format: "zip",
          url: `${publicBase}/${archiveName}`,
          size: archive.length,
          sha256: archiveSha256,
          checksumUrl: `${publicBase}/${archiveName}.sha256`,
        },
      });
    }
    await writeFile(
      resolve(staging, "manifest.json"),
      `${JSON.stringify(rootManifest, null, 2)}\n`,
    );
    await replaceDirectory(staging, outputRoot);
    return rootManifest;
  } finally {
    await rm(staging, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildSkillDownloads();
  process.stdout.write(`Skill downloads: ${manifest.skills.length} -> pages/public/skills\n`);
}
