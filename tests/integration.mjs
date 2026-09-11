import assert from "node:assert/strict";
const base = process.env.DUKA_TEST_URL || "http://127.0.0.1:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Integration tests must run against a local test database.");
const shop = `duka-test-${crypto.randomUUID()}`;
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-11-25",
  "oai-authenticated-user-id": shop,
};
let checks = 0,
  rpc = 0;
async function http(path, method = "GET", body, extra = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...headers, ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data =
    response.status === 202 || response.status === 405
      ? null
      : await response.json();
  return { status: response.status, data };
}
async function tool(name, args = {}) {
  const r = await http("/api/mcp", "POST", {
    jsonrpc: "2.0",
    id: ++rpc,
    method: "tools/call",
    params: { name, arguments: args },
  });
  assert.equal(r.status, 200);
  return r.data.result;
}
async function plan(command) {
  const r = await tool("preview_stock_change", { command });
  assert.equal(r.isError, false);
  return r.structuredContent.plan;
}
async function review(id, action = "confirm", extra = {}) {
  return http(
    "/api/review",
    "POST",
    { id, action },
    { "X-Duka-Review": "1", ...extra },
  );
}
function passed(label) {
  checks++;
  console.log(`PASS ${label}`);
}
const init = await http("/api/mcp", "POST", {
  jsonrpc: "2.0",
  id: ++rpc,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "duka-integration-tests", version: "1" },
  },
});
assert.equal(init.data.result.protocolVersion, "2025-11-25");
passed("MCP initialization");
assert.equal(
  (
    await http("/api/mcp", "POST", {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    })
  ).status,
  202,
);
passed("MCP initialized notification");
const list = await http("/api/mcp", "POST", {
  jsonrpc: "2.0",
  id: ++rpc,
  method: "tools/list",
});
assert.equal(list.data.result.tools.length, 4);
assert.ok(
  !list.data.result.tools.some((t) => /confirm|apply|send|pay/.test(t.name)),
);
passed("MCP exposes no commit or payment tools");
let state = (await http("/api/stock")).data;
assert.equal(state.products.length, 10);
assert.equal(state.revision, 0);
passed("new shop sample inventory");
const first = await plan("Sold 3 milk and 2 bread");
assert.equal((await http("/api/stock")).data.products[0].quantity, 8);
passed("preview has no stock side effects");
let saved = await review(first.id);
assert.equal(saved.status, 200);
assert.equal(saved.data.state.products[0].quantity, 5);
assert.equal(saved.data.state.products[1].quantity, 4);
assert.equal(saved.data.state.activity.length, 1);
passed("compound confirmation atomically saves both changes");
saved = await review(first.id);
assert.equal(saved.data.state.products[0].quantity, 5);
assert.equal(saved.data.state.activity.length, 1);
passed("confirmation replay is idempotent");
const cancelled = await plan("Received 10 milk");
await review(cancelled.id, "cancel");
assert.equal((await review(cancelled.id)).status, 409);
passed("cancelled plan cannot apply");
const stale = await plan("Received 2 milk");
const fresh = await plan("Received 4 bread");
await review(fresh.id);
assert.equal((await review(stale.id)).status, 409);
assert.equal((await http("/api/stock")).data.products[0].quantity, 5);
passed("stale plan rejected without partial writes");
const [raceA, raceB] = await Promise.all([
  plan("Received 1 water"),
  plan("Received 2 tea"),
]);
const races = await Promise.all([review(raceA.id), review(raceB.id)]);
assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
passed("concurrent conflicting plans have exactly one winner");
const invalid = await tool("preview_stock_change", {
  command: "Sold 999 milk",
});
assert.equal(invalid.isError, true);
passed("negative-stock sale refused");
const reorder = await tool("prepare_reorder");
const reorderPlan = reorder.structuredContent.plan;
await review(reorderPlan.id);
state = (await http("/api/stock")).data;
assert.equal(state.reorders.length, 1);
assert.equal(state.reorders[0].status, "draft");
passed("reorder saved as unsent draft");
const download = await fetch(base + `/api/reorders/${reorderPlan.id}`, {
  headers,
});
assert.equal(download.status, 200);
assert.match(download.headers.get("content-type"), /text\/csv/);
assert.match(await download.text(), /Fresh milk/);
passed("draft CSV export");
const other = { "oai-authenticated-user-id": `other-${shop}` };
assert.equal((await review(reorderPlan.id, "confirm", other)).status, 404);
const privateCsv = await fetch(base + `/api/reorders/${reorderPlan.id}`, {
  headers: { ...headers, ...other },
});
assert.equal(privateCsv.status, 404);
passed("cross-shop plans and exports are inaccessible");
assert.equal(
  (
    await http(
      "/api/mcp",
      "POST",
      { jsonrpc: "2.0", id: ++rpc, method: "ping" },
      { Origin: "https://untrusted.example" },
    )
  ).status,
  403,
);
passed("cross-origin calls rejected");
assert.equal((await http("/api/mcp")).status, 405);
passed("MCP GET correctly declines SSE");
assert.equal(
  (
    await http(
      "/api/mcp",
      "POST",
      { jsonrpc: "2.0", id: ++rpc, method: "ping" },
      { "MCP-Protocol-Version": "1900-01-01" },
    )
  ).status,
  400,
);
passed("unsupported protocol rejected");
assert.equal(
  (await http("/api/review", "POST", { id: first.id, action: "confirm" }))
    .status,
  403,
);
passed("review requires the browser review header");
console.log(`${checks} integration checks passed. Isolated test shop: ${shop}`);
