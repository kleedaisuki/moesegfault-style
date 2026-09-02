/**
 * @file CDN 发布工具自测 / CDN release utility self-tests.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  describeContents,
  discoverExactReleases,
  isPrereleaseVersion,
  jsonText,
  replaceDirectory,
} from "./cdn-lib.mjs";

/** @brief 发布历史检查脚本 / Release-history verification script. */
const HISTORY_SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "verify-release-history.mjs",
);

test("release metadata uses the slashless version URL contract", () => {
  /** @brief 测试 HTML 元数据 / Test HTML metadata. */
  const metadata = describeContents("<!doctype html>", "colors/index.html", "0.1.1");
  assert.equal(metadata.url, "/v0.1.1/colors/index.html");
  assert.equal(metadata.mediaType, "text/html; charset=utf-8");
});

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
  await writeFile(resolve(target, "manifest.json"), jsonText({ version, baseUrl: `/v${version}` }));
}

test("discoverExactReleases finds every exact version and ignores aliases", async () => {
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "v0.10.0", "0.10.0");
    await writeVersion(root, "v0.2.0", "0.2.0");
    await writeVersion(root, "v1.0.0", "1.0.0");
    await mkdir(resolve(root, "latest"));
    await mkdir(resolve(root, "v0"));
    await mkdir(resolve(root, "v"));

    assert.deepEqual(await discoverExactReleases(root), [
      { version: "0.2.0", baseUrl: "/v0.2.0", manifestUrl: "/v0.2.0/manifest.json" },
      { version: "0.10.0", baseUrl: "/v0.10.0", manifestUrl: "/v0.10.0/manifest.json" },
      { version: "1.0.0", baseUrl: "/v1.0.0", manifestUrl: "/v1.0.0/manifest.json" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("discoverExactReleases rejects a directory and manifest version mismatch", async () => {
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "v3.0.0", "4.0.0");
    await assert.rejects(discoverExactReleases(root), /Exact release has an invalid manifest/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("prereleases are identified independently from exact release discovery", async () => {
  assert.equal(isPrereleaseVersion("3.0.0-beta.2"), true);
  assert.equal(isPrereleaseVersion("3.0.0"), false);
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-"));
  try {
    await writeVersion(root, "v3.0.0-beta.2", "3.0.0-beta.2");
    assert.deepEqual(await discoverExactReleases(root), [
      {
        version: "3.0.0-beta.2",
        baseUrl: "/v3.0.0-beta.2",
        manifestUrl: "/v3.0.0-beta.2/manifest.json",
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("replaceDirectory rolls back a failed swap without leaving staging directories", async () => {
  /** @brief 隔离测试目录 / Isolated test directory. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-cdn-swap-"));
  /** @brief 新内容源目录 / New-content source directory. */
  const source = resolve(root, "source");
  /** @brief 已有别名目录 / Existing alias directory. */
  const target = resolve(root, "target");
  try {
    await mkdir(source);
    await mkdir(target);
    await writeFile(resolve(source, "value.txt"), "new");
    await writeFile(resolve(target, "value.txt"), "old");
    /** @brief 重命名调用次数 / Rename call count. */
    let renameCalls = 0;
    await assert.rejects(
      replaceDirectory(source, target, {
        async renamePath(from, to) {
          renameCalls += 1;
          if (renameCalls === 2) {
            /** @brief 模拟的 Windows 共享冲突 / Simulated Windows sharing conflict. */
            const error = new Error("simulated EPERM");
            error.code = "EPERM";
            throw error;
          }
          await rename(from, to);
        },
      }),
      /simulated EPERM/,
    );
    assert.equal(await readFile(resolve(target, "value.txt"), "utf8"), "old");
    assert.deepEqual(
      (await readdir(root)).filter((name) => name.includes(".tmp-") || name.includes(".backup-")),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release history rejects deleting a canonical exact release", async () => {
  /** @brief 隔离 Git 仓库 / Isolated Git repository. */
  const root = await mkdtemp(resolve(tmpdir(), "moesegfault-history-"));
  try {
    execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "CDN test"], { cwd: root });
    /** @brief 规范精确版本文件 / Canonical exact-version asset. */
    const asset = resolve(root, "static-releases", "v0.1.0", "css", "all.css");
    await mkdir(dirname(asset), { recursive: true });
    await writeFile(asset, "old release");
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-m", "baseline"], { cwd: root, stdio: "ignore" });
    /** @brief 不可变发布基线 / Immutable release baseline. */
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    await rm(resolve(root, "static-releases", "v0.1.0"), { recursive: true });
    execFileSync("git", ["add", "-A"], { cwd: root });
    execFileSync("git", ["commit", "-m", "delete release"], { cwd: root, stdio: "ignore" });
    assert.throws(
      () => execFileSync(process.execPath, [HISTORY_SCRIPT, base], { cwd: root, stdio: "pipe" }),
      (error) => error.status === 1 && error.stderr.toString().includes("immutable"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
