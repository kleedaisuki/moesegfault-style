/**
 * @file 技能静态下载构建器自测 / Skill static-download builder self-tests.
 */

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { buildSkillDownloads } from "./build-skill-downloads.mjs";

/**
 * @brief 解析本构建器生成的 STORE ZIP 本地记录 / Parse STORE ZIP local records emitted by this builder.
 * @param {Buffer} archive ZIP 内容 / ZIP contents.
 * @return {Map<string,Buffer>} 路径到正文 / Paths to payloads.
 */
function readStoredEntries(archive) {
  /** @brief 已解析条目 / Parsed entries. */
  const entries = new Map();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    /** @brief 文件名长度 / File-name length. */
    const nameLength = archive.readUInt16LE(offset + 26);
    /** @brief 扩展字段长度 / Extra-field length. */
    const extraLength = archive.readUInt16LE(offset + 28);
    /** @brief 正文长度 / Payload length. */
    const size = archive.readUInt32LE(offset + 22);
    /** @brief 文件名起点 / File-name start. */
    const nameStart = offset + 30;
    /** @brief 正文起点 / Payload start. */
    const dataStart = nameStart + nameLength + extraLength;
    entries.set(
      archive.subarray(nameStart, nameStart + nameLength).toString("utf8"),
      archive.subarray(dataStart, dataStart + size),
    );
    offset = dataStart + size;
  }
  assert.equal(
    archive.readUInt32LE(offset),
    0x02014b50,
    "archive must contain a central directory",
  );
  return entries;
}

test("skill downloads preserve source files and produce a verifiable deterministic archive", async () => {
  /** @brief 仓库内测试暂存根目录 / Repository-local test scratch root. */
  const root = resolve(".temp", `skill-downloads-${randomUUID()}`);
  /** @brief 技能源目录 / Skill source root. */
  const source = resolve(root, "skills");
  /** @brief 首次构建输出 / First build output. */
  const output = resolve(root, "public");
  /** @brief 二次构建输出 / Second build output. */
  const secondOutput = resolve(root, "public-second");
  try {
    await mkdir(resolve(source, "moe-style", "references"), { recursive: true });
    await writeFile(
      resolve(source, "moe-style", "SKILL.md"),
      "---\nname: moe-style\ndescription: Apply the style.\n---\n\n# Moe Style\n",
    );
    await writeFile(resolve(source, "moe-style", "references", "tokens.md"), "# Tokens\n");

    /** @brief 首次生成清单 / First generated manifest. */
    const first = await buildSkillDownloads({ sourceRoot: source, outputRoot: output });
    await buildSkillDownloads({ sourceRoot: source, outputRoot: secondOutput });
    assert.equal(first.skills.length, 1);
    assert.equal(first.skills[0].entrypoint, "/skills/moe-style/SKILL.md");
    assert.equal(
      await readFile(resolve(output, "moe-style", "SKILL.md"), "utf8"),
      await readFile(resolve(source, "moe-style", "SKILL.md"), "utf8"),
    );

    /** @brief 首次归档 / First archive. */
    const archive = await readFile(resolve(output, "moe-style.zip"));
    assert.deepEqual(archive, await readFile(resolve(secondOutput, "moe-style.zip")));
    /** @brief 归档条目 / Archive entries. */
    const entries = readStoredEntries(archive);
    assert.deepEqual([...entries.keys()], ["moe-style/SKILL.md", "moe-style/references/tokens.md"]);
    assert.equal(
      entries.get("moe-style/SKILL.md").toString("utf8"),
      await readFile(resolve(source, "moe-style", "SKILL.md"), "utf8"),
    );

    /** @brief 根技能清单 / Root skill manifest. */
    const rootManifest = JSON.parse(await readFile(resolve(output, "manifest.json"), "utf8"));
    /** @brief 清单内技能条目 / Skill entry in the manifest. */
    const manifest = rootManifest.skills[0];
    /** @brief 归档 SHA-256 / Archive SHA-256. */
    const digest = createHash("sha256").update(archive).digest("hex");
    assert.equal(manifest.archive.sha256, digest);
    assert.equal(manifest.archive.url, "/skills/moe-style.zip");
    assert.equal(
      await readFile(resolve(output, "moe-style.zip.sha256"), "utf8"),
      `${digest}  moe-style.zip\n`,
    );
    assert.deepEqual(
      manifest.files.map(({ path }) => path),
      ["SKILL.md", "references/tokens.md"],
    );
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
