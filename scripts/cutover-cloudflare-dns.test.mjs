/** @file 一次性 DNS 切换脚本测试 / One-time DNS cutover script tests. */

import assert from "node:assert/strict";
import test from "node:test";
import { removeLegacyCname, restoreLegacyCname } from "./cutover-cloudflare-dns.mjs";

/**
 * 构造按顺序返回的 Cloudflare API 替身 / Build an ordered Cloudflare API stub.
 * @param {Array<{result?:unknown,status?:number,success?:boolean,errors?:unknown[]}>} replies Replies / 响应。
 * @returns {{fetch:typeof fetch,calls:Array<{url:string,method:string}>}} Stub and calls / 替身与调用。
 */
function api(replies) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET" });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected API request");
    const status = reply.status ?? 200;
    return new Response(
      JSON.stringify({
        success: reply.success ?? status < 400,
        result: reply.result ?? null,
        errors: reply.errors ?? [],
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  };
  return { fetch, calls };
}

test("deletes only the expected GitHub Pages CNAME", async () => {
  const stub = api([
    { result: [{ id: "record-id", content: "kleedaisuki.github.io" }] },
    { result: { id: "record-id" } },
  ]);
  assert.equal(
    await removeLegacyCname({
      token: "token",
      zoneId: "zone-id",
      fetchImpl: stub.fetch,
      log() {},
    }),
    "deleted",
  );
  assert.equal(stub.calls[1].method, "DELETE");
  assert.match(stub.calls[1].url, /zones\/zone-id\/dns_records\/record-id$/);
});

test("is idempotent after the legacy record is absent", async () => {
  const stub = api([{ result: [] }]);
  assert.equal(
    await removeLegacyCname({
      token: "token",
      zoneId: "zone-id",
      fetchImpl: stub.fetch,
      log() {},
    }),
    "absent",
  );
  assert.equal(stub.calls.length, 1);
});

test("refuses an unexpected DNS target", async () => {
  const stub = api([{ result: [{ id: "record-id", content: "unexpected.example" }] }]);
  await assert.rejects(
    removeLegacyCname({ token: "token", zoneId: "zone-id", fetchImpl: stub.fetch, log() {} }),
    /Refusing to delete/,
  );
  assert.equal(stub.calls.length, 1);
});

test("surfaces Cloudflare API failures without exposing the token", async () => {
  const stub = api([{ status: 403, success: false, errors: [{ code: 10000, message: "denied" }] }]);
  await assert.rejects(
    removeLegacyCname({
      token: "secret-token",
      zoneId: "zone-id",
      fetchImpl: stub.fetch,
      log() {},
    }),
    (error) =>
      error.message === "Cloudflare API 403: 10000: denied" &&
      !error.message.includes("secret-token"),
  );
});

test("restores the saved CNAME only when the hostname is empty", async () => {
  const stub = api([{ result: [] }, { result: { id: "restored-record" } }]);
  const record = {
    content: "kleedaisuki.github.io",
    ttl: 3600,
    proxied: false,
    comment: "GitHub Pages",
    tags: ["legacy"],
  };
  assert.equal(
    await restoreLegacyCname({
      token: "token",
      zoneId: "zone-id",
      record,
      fetchImpl: stub.fetch,
      log() {},
    }),
    "restored",
  );
  assert.equal(stub.calls[1].method, "POST");
});

test("does not overwrite replacement DNS during rollback", async () => {
  const stub = api([{ result: [{ id: "worker-record", type: "AAAA" }] }]);
  assert.equal(
    await restoreLegacyCname({
      token: "token",
      zoneId: "zone-id",
      record: { content: "kleedaisuki.github.io" },
      fetchImpl: stub.fetch,
      log() {},
    }),
    "present",
  );
  assert.equal(stub.calls.length, 1);
});
