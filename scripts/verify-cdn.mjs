/**
 * @file 验证精确版本、latest 与 Pages 镜像 / Verify exact releases, latest, and the Pages mirror.
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeFile,
  discoverExactReleases,
  isPrereleaseVersion,
  listFiles,
  readJson,
  relativeUrl,
} from "./cdn-lib.mjs";

/** @brief 仓库根目录 / Repository root. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** @brief 持久发布物目录 / Persistent releases directory. */
const RELEASES = resolve(ROOT, "static-releases");
/** @brief Pages 公共目录 / Pages public directory. */
const PUBLIC = resolve(ROOT, "pages/public");

/**
 * @brief 比较两个目录的全部文件内容 / Compare all file contents in two directories.
 * @param {string} expected 参考目录 / Reference directory.
 * @param {string} actual 待检查目录 / Directory under test.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function assertDirectoryEqual(expected, actual) {
  /** @brief 参考文件路径 / Reference file paths. */
  const expectedFiles = (await listFiles(expected))
    .map((path) => relativeUrl(expected, path))
    .sort();
  /** @brief 实际文件路径 / Actual file paths. */
  const actualFiles = (await listFiles(actual)).map((path) => relativeUrl(actual, path)).sort();
  assert.deepEqual(actualFiles, expectedFiles, `${actual} file set differs`);
  for (const path of expectedFiles) {
    assert.deepEqual(
      await readFile(resolve(actual, path)),
      await readFile(resolve(expected, path)),
      `${path} differs`,
    );
  }
}

/**
 * @brief 验证一个精确版本的清单和摘要 / Verify one exact release manifest and its digests.
 * @param {string} version 精确语义版本 / Exact semantic version.
 * @return {Promise<object>} 已验证清单 / Verified manifest.
 */
async function verifyExactRelease(version) {
  /** @brief 精确版本目录 / Exact-version directory. */
  const exact = resolve(RELEASES, `v${version}`);
  /** @brief 精确版本清单 / Exact-version manifest. */
  const manifest = await readJson(resolve(exact, "manifest.json"));
  assert.equal(manifest.version, version);
  assert.equal(manifest.baseUrl, `/v${version}`);
  /** @brief 实际载荷文件路径 / Actual payload paths. */
  const actualPaths = (await listFiles(exact))
    .map((path) => relativeUrl(exact, path))
    .filter((path) => path !== "manifest.json")
    .sort();
  assert.deepEqual(
    actualPaths,
    manifest.files.map((file) => file.path).sort(),
    `v${version} manifest inventory differs`,
  );
  for (const expected of manifest.files) {
    /** @brief 重新计算的文件元数据 / Recomputed file metadata. */
    const actual = await describeFile(resolve(exact, expected.path), expected.path, version);
    assert.deepEqual(actual, expected, `v${version}/${expected.path} metadata differs`);
  }
  return manifest;
}

/**
 * @brief 断言旧嵌套路径和主版本别名均已移除 / Assert legacy nesting and major aliases are absent.
 * @param {string} root 待检查根目录 / Root directory to inspect.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function assertNoObsoleteVersionDirectories(root) {
  /** @brief 顶层目录名 / Top-level directory names. */
  const names = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.equal(names.includes("v"), false, `${root} still contains legacy /v/ nesting`);
  assert.deepEqual(
    names.filter((name) => /^v\d+$/.test(name)),
    [],
    `${root} still contains a major-version alias`,
  );
}

/**
 * @brief 执行全部验证 / Run all verification checks.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function main() {
  /** @brief 根发现清单 / Root discovery manifest. */
  const manifest = await readJson(resolve(RELEASES, "manifest.json"));
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(isPrereleaseVersion(manifest.latestVersion), false, "latest must remain stable");
  assert.equal(manifest.latestBaseUrl, "/latest");
  /** @brief 磁盘中的全部精确版本 / Every exact release on disk. */
  const exactReleases = await discoverExactReleases(RELEASES);
  assert.deepEqual(manifest.publishedVersions, exactReleases);
  assert.ok(
    exactReleases.some(({ version }) => version === manifest.latestVersion),
    "latestVersion must name a published exact release",
  );
  await assertNoObsoleteVersionDirectories(RELEASES);
  await assertNoObsoleteVersionDirectories(PUBLIC);

  for (const { version } of exactReleases) {
    await verifyExactRelease(version);
    await assertDirectoryEqual(resolve(RELEASES, `v${version}`), resolve(PUBLIC, `v${version}`));
  }
  /** @brief latest 自身的精确版本清单 / Exact-version manifest mirrored by latest. */
  const latestManifest = await readJson(resolve(RELEASES, "latest", "manifest.json"));
  assert.equal(latestManifest.version, manifest.latestVersion);
  for (const file of latestManifest.files.filter(({ path }) => path !== "index.html")) {
    assert.deepEqual(
      await readFile(resolve(RELEASES, "latest", file.path)),
      await readFile(resolve(RELEASES, `v${manifest.latestVersion}`, file.path)),
      `latest/${file.path} differs from its exact release`,
    );
  }
  assert.match(
    await readFile(resolve(RELEASES, "latest", "index.html"), "utf8"),
    new RegExp(`/v${manifest.latestVersion}/`),
    "latest landing page must redirect to the latest exact release",
  );
  for (const name of ["latest", "css", "tokens", "colors"]) {
    await assertDirectoryEqual(resolve(RELEASES, name), resolve(PUBLIC, name));
  }
  await assertDirectoryEqual(
    resolve(RELEASES, "css"),
    resolve(RELEASES, `v${manifest.latestVersion}`, "css"),
  );
  await assertDirectoryEqual(
    resolve(RELEASES, "tokens"),
    resolve(RELEASES, `v${manifest.latestVersion}`, "tokens"),
  );
  assert.deepEqual(
    await readFile(resolve(RELEASES, "colors", "colors.css")),
    await readFile(resolve(RELEASES, `v${manifest.latestVersion}`, "colors", "colors.css")),
  );
  assert.deepEqual(
    await readFile(resolve(RELEASES, "colors", "colors.json")),
    await readFile(resolve(RELEASES, `v${manifest.latestVersion}`, "colors", "colors.json")),
  );
  assert.match(
    await readFile(resolve(RELEASES, "colors", "index.html"), "utf8"),
    new RegExp(`/v${manifest.latestVersion}/colors/`),
    "default /colors must redirect to the latest exact version",
  );
  assert.equal(manifest.defaultVersion, manifest.latestVersion);
  assert.deepEqual(manifest.defaultResources, {
    styles: "/css/all.css",
    colors: "/colors/",
    colorsCss: "/colors/colors.css",
    colorsJson: "/colors/colors.json",
    tokensJson: "/tokens/tokens.json",
  });
  assert.deepEqual(
    await readFile(resolve(PUBLIC, "manifest.json")),
    await readFile(resolve(RELEASES, "manifest.json")),
    "public manifest differs",
  );
  process.stdout.write(
    `Verified CDN ${manifest.latestVersion}: ${exactReleases.length} exact releases and latest\n`,
  );
}

await main();
