/**
 * @file 一次性移除旧 GitHub Pages CNAME / One-time removal of the legacy GitHub Pages CNAME.
 *
 * The operation is deliberately narrow: only the exact
 * `style.moesegfault.dev -> kleedaisuki.github.io` CNAME may be deleted.
 */

import { dirname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const API_ROOT = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = "moesegfault.dev";
const HOSTNAME = "style.moesegfault.dev";
const LEGACY_TARGET = "kleedaisuki.github.io";
const BACKUP_PATH = resolve(".temp/cloudflare-legacy-dns.json");

/**
 * 调用 Cloudflare API 并验证标准响应 / Call the Cloudflare API and validate its envelope.
 * @param {string} token Cloudflare API token / Cloudflare API 令牌。
 * @param {string} path API path / API 路径。
 * @param {RequestInit} [init] Fetch options / Fetch 选项。
 * @param {typeof fetch} [fetchImpl] Injectable fetch / 可注入的 fetch。
 * @returns {Promise<unknown>} API result / API 结果。
 */
async function cloudflare(token, path, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    const detail = body.errors?.map((error) => `${error.code}: ${error.message}`).join("; ");
    throw new Error(`Cloudflare API ${response.status}: ${detail || "unknown error"}`);
  }
  return body.result;
}

/**
 * 删除且仅删除预期的旧 CNAME / Delete the expected legacy CNAME and nothing else.
 * @param {{token:string,fetchImpl?:typeof fetch,log?:(message:string)=>void,beforeDelete?:(record:object)=>Promise<void>}} options Options / 选项。
 * @returns {Promise<"deleted"|"absent">} Cutover result / 切换结果。
 */
export async function removeLegacyCname({
  token,
  fetchImpl = fetch,
  log = console.log,
  beforeDelete = async () => {},
}) {
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is required");

  const zones = await cloudflare(
    token,
    `/zones?${new URLSearchParams({ name: ZONE_NAME, status: "active" })}`,
    {},
    fetchImpl,
  );
  if (!Array.isArray(zones) || zones.length !== 1) {
    throw new Error(`Expected one active ${ZONE_NAME} zone, found ${zones?.length ?? 0}`);
  }

  const records = await cloudflare(
    token,
    `/zones/${zones[0].id}/dns_records?${new URLSearchParams({ type: "CNAME", name: HOSTNAME })}`,
    {},
    fetchImpl,
  );
  if (!Array.isArray(records) || records.length === 0) {
    log(`Legacy CNAME already absent: ${HOSTNAME}`);
    return "absent";
  }
  if (
    records.length !== 1 ||
    records[0].content.replace(/\.$/, "").toLowerCase() !== LEGACY_TARGET
  ) {
    throw new Error(`Refusing to delete an unexpected DNS record for ${HOSTNAME}`);
  }

  await beforeDelete(records[0]);
  await cloudflare(
    token,
    `/zones/${zones[0].id}/dns_records/${records[0].id}`,
    { method: "DELETE" },
    fetchImpl,
  );
  log(`Removed legacy CNAME: ${HOSTNAME} -> ${LEGACY_TARGET}`);
  return "deleted";
}

/**
 * 部署失败且 hostname 仍为空时恢复旧记录 / Restore the legacy record only when deployment failed and the hostname is still empty.
 * @param {{token:string,record:object,fetchImpl?:typeof fetch,log?:(message:string)=>void}} options Options / 选项。
 * @returns {Promise<"restored"|"present">} Recovery result / 恢复结果。
 */
export async function restoreLegacyCname({ token, record, fetchImpl = fetch, log = console.log }) {
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is required");
  if (record?.content?.replace(/\.$/, "").toLowerCase() !== LEGACY_TARGET) {
    throw new Error("Refusing to restore an unexpected DNS record");
  }

  const zones = await cloudflare(
    token,
    `/zones?${new URLSearchParams({ name: ZONE_NAME, status: "active" })}`,
    {},
    fetchImpl,
  );
  if (!Array.isArray(zones) || zones.length !== 1) {
    throw new Error(`Expected one active ${ZONE_NAME} zone, found ${zones?.length ?? 0}`);
  }

  const current = await cloudflare(
    token,
    `/zones/${zones[0].id}/dns_records?${new URLSearchParams({ name: HOSTNAME })}`,
    {},
    fetchImpl,
  );
  if (!Array.isArray(current)) throw new Error("Invalid DNS record response");
  if (current.length > 0) {
    log(`DNS already exists for ${HOSTNAME}; rollback left it unchanged`);
    return "present";
  }

  await cloudflare(
    token,
    `/zones/${zones[0].id}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: HOSTNAME,
        content: LEGACY_TARGET,
        ttl: record.ttl ?? 1,
        proxied: record.proxied ?? false,
        comment: record.comment ?? undefined,
        tags: record.tags ?? [],
      }),
    },
    fetchImpl,
  );
  log(`Restored legacy CNAME: ${HOSTNAME} -> ${LEGACY_TARGET}`);
  return "restored";
}

/** 执行一次性切换命令 / Run the one-time cutover command. */
async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN ?? "";
  if ((process.argv[2] ?? "remove") === "restore") {
    try {
      const record = JSON.parse(await readFile(BACKUP_PATH, "utf8"));
      await restoreLegacyCname({ token, record });
    } catch (error) {
      if (error?.code === "ENOENT") {
        console.log("No legacy DNS backup exists; rollback is unnecessary");
        return;
      }
      throw error;
    }
    return;
  }

  await removeLegacyCname({
    token,
    async beforeDelete(record) {
      await mkdir(dirname(BACKUP_PATH), { recursive: true });
      await writeFile(BACKUP_PATH, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
