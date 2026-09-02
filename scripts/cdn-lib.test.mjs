/**
 * @file CDN 发布工具自测 / CDN release utility self-tests.
 */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { discoverMajorAliases, isPrereleaseVersion, jsonText } from "./cdn-lib.mjs";

/**
 * @brief 写入测试版本目录 / Write a test version directory.
 * @param {string} root 测试根目录 / Test root directory.
 * @param {string} directory 目录名 / Directory name.
 * @param {string} version 清单版本 / Manifest version.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function writeVersion(root, directory, version) {
  /** @brief 测试版本目录 / Test version directory. */
  const target = resolve(root, directory);
  await mkdir(target, { recursive: true });
  await writeFile(resolve(target, "manifest.json"), jsonText({ version }));
}

test("discoverMajorAliases finds every numeric alias in numeric order", async () => {
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "12", "12.4.0");
    await writeVersion(root, "2", "2.9.1");
    await writeVersion(root, "latest", "12.4.0");
    await writeVersion(root, "12.4.0", "12.4.0");

    assert.deepEqual(await discoverMajorAliases(root), [
      { alias: "2", version: "2.9.1", baseUrl: "/v/2" },
      { alias: "12", version: "12.4.0", baseUrl: "/v/12" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("discoverMajorAliases rejects a numeric alias for another major", async () => {
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "3", "4.0.0");
    await assert.rejects(discoverMajorAliases(root), /Major alias manifest has an invalid version/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("prereleases are identified and cannot become numeric aliases", async () => {
  assert.equal(isPrereleaseVersion("3.0.0-beta.2"), true);
  assert.equal(isPrereleaseVersion("3.0.0"), false);
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "3", "3.0.0-beta.2");
    await assert.rejects(discoverMajorAliases(root), /Major alias manifest has an invalid version/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
