/**
 * @file 验证 CDN 清单、摘要、别名与 Pages 镜像 / Verify CDN manifests, digests, aliases, and Pages mirror.
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeFile,
  discoverMajorAliases,
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
 * @param {object} rootManifest 根发现清单 / Root discovery manifest.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function verifyExactRelease(rootManifest) {
  /** @brief 精确版本目录 / Exact-version directory. */
  const exact = resolve(RELEASES, `v${rootManifest.version}`);
  /** @brief 精确版本清单 / Exact-version manifest. */
  const manifest = await readJson(resolve(exact, "manifest.json"));
  assert.equal(manifest.version, rootManifest.version);
  assert.deepEqual(manifest.files, rootManifest.files);
  /** @brief 实际载荷文件路径 / Actual payload paths. */
  const actualPaths = (await listFiles(exact))
    .map((path) => relativeUrl(exact, path))
    .filter((path) => path !== "manifest.json")
    .sort();
  assert.deepEqual(
    actualPaths,
    manifest.files.map((file) => file.path).sort(),
    "manifest inventory differs",
  );

  for (const expected of manifest.files) {
    /** @brief 重新计算的文件元数据 / Recomputed file metadata. */
    const actual = await describeFile(
      resolve(exact, expected.path),
      expected.path,
      manifest.version,
    );
    assert.deepEqual(actual, expected, `${expected.path} metadata differs`);
  }
}

/**
 * @brief 执行全部验证 / Run all verification checks.
 * @return {Promise<void>} 完成信号 / Completion signal.
 */
async function main() {
  /** @brief 根发现清单 / Root discovery manifest. */
  const manifest = await readJson(resolve(RELEASES, "manifest.json"));
  assert.equal(isPrereleaseVersion(manifest.version), false, "root manifest must remain stable");
  await verifyExactRelease(manifest);
  /** @brief 磁盘中的全部精确版本目录 / Every exact-version directory on disk. */
  const exactNames = (await readdir(RELEASES, { withFileTypes: true }))
    .filter(
      (entry) => entry.isDirectory() && /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
  for (const exactName of exactNames) {
    /** @brief 当前精确版本清单 / Current exact-version manifest. */
    const exactManifest = await readJson(resolve(RELEASES, exactName, "manifest.json"));
    assert.equal(
      exactName,
      `v${exactManifest.version}`,
      `${exactName} has the wrong manifest version`,
    );
    assert.equal(exactManifest.baseUrl, `/${exactName}`, `${exactName} has the wrong base URL`);
    await verifyExactRelease(exactManifest);
    await assertDirectoryEqual(resolve(RELEASES, exactName), resolve(PUBLIC, exactName));
  }
  /** @brief 从磁盘发现的主版本别名 / Major-version aliases discovered from disk. */
  const majorAliases = await discoverMajorAliases(RELEASES);
  /** @brief 期望的完整别名映射 / Expected complete alias map. */
  const expectedAliases = Object.fromEntries(
    majorAliases.map((alias) => [alias.alias, alias.version]),
  );
  /** @brief 期望的完整别名 URL 映射 / Expected complete alias URL map. */
  const expectedAliasBaseUrls = Object.fromEntries(
    majorAliases.map((alias) => [alias.alias, alias.baseUrl]),
  );
  expectedAliases.latest = manifest.version;
  expectedAliasBaseUrls.latest = "/latest";
  expectedAliases.default = manifest.version;
  expectedAliasBaseUrls.default = "/";
  assert.deepEqual(
    manifest.aliases,
    expectedAliases,
    "root aliases do not match numeric directories",
  );
  assert.deepEqual(
    manifest.aliasBaseUrls,
    expectedAliasBaseUrls,
    "root alias base URLs do not match numeric directories",
  );

  for (const { alias, version } of majorAliases) {
    /** @brief 主版本别名自身的清单 / Major alias's own manifest. */
    const aliasManifest = await readJson(resolve(RELEASES, alias, "manifest.json"));
    assert.equal(aliasManifest.version, version, `${alias} manifest version differs`);
    await verifyExactRelease(aliasManifest);
    await assertDirectoryEqual(resolve(RELEASES, `v${version}`), resolve(RELEASES, alias));
  }
  await assertDirectoryEqual(
    resolve(RELEASES, `v${manifest.version}`),
    resolve(RELEASES, "latest"),
  );
  for (const name of [
    "latest",
    ...majorAliases.map(({ alias }) => alias),
    "css",
    "tokens",
    "colors",
  ]) {
    await assertDirectoryEqual(resolve(RELEASES, name), resolve(PUBLIC, name));
  }
  await assertDirectoryEqual(
    resolve(RELEASES, "css"),
    resolve(RELEASES, `v${manifest.version}`, "css"),
  );
  await assertDirectoryEqual(
    resolve(RELEASES, "tokens"),
    resolve(RELEASES, `v${manifest.version}`, "tokens"),
  );
  assert.deepEqual(
    await readFile(resolve(RELEASES, "colors", "colors.css")),
    await readFile(resolve(RELEASES, `v${manifest.version}`, "colors", "colors.css")),
  );
  assert.deepEqual(
    await readFile(resolve(RELEASES, "colors", "colors.json")),
    await readFile(resolve(RELEASES, `v${manifest.version}`, "colors", "colors.json")),
  );
  assert.match(
    await readFile(resolve(RELEASES, "colors", "index.html"), "utf8"),
    new RegExp(`/v${manifest.version}/colors/`),
    "default /colors must redirect to the current exact version",
  );
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
    `Verified CDN ${manifest.version}: ${manifest.files.length} files and ${Object.keys(manifest.aliases).length} aliases\n`,
  );
}

await main();
