import {
  bodyOf,
  failure,
  json,
  preview,
  shopIdentity,
  snapshot,
} from "@/lib/server";
import { StockError } from "@/lib/stock";
export const PROTOCOL = "2025-11-25";
const empty = { type: "object", properties: {}, additionalProperties: false };
export const TOOLS = [
  {
    name: "stock_overview",
    description:
      "Read current quantities and low stock. Does not change stock.",
    inputSchema: empty,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "preview_stock_change",
    description:
      'Parse a command and return a reviewable plan. Examples: "Sold 3 milk and 2 bread", "Received 12 bread", "Set sugar to 10". Never applies stock changes. A person must confirm in the Duka web UI.',
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", maxLength: 500 } },
      required: ["command"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "prepare_reorder",
    description:
      "Prepare, but do not save or send, a reorder plan for low stock. A person must review quantities and save it in Duka.",
    inputSchema: empty,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "list_activity",
    description: "Read the last 100 confirmed changes.",
    inputSchema: empty,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
export async function POST(request: Request) {
  try {
    const shop = shopIdentity(request);
    const version = request.headers.get("mcp-protocol-version");
    if (version && version !== PROTOCOL)
      throw new StockError("Unsupported MCP protocol version.");
    const accept = request.headers.get("accept") ?? "";
    if (
      !accept.includes("application/json") ||
      !accept.includes("text/event-stream")
    )
      throw new StockError(
        "Accept application/json and text/event-stream.",
        406,
      );
    const body = await bodyOf(request);
    if (
      !body ||
      Array.isArray(body) ||
      body.jsonrpc !== "2.0" ||
      typeof body.method !== "string" ||
      (body.id !== undefined &&
        typeof body.id !== "number" &&
        typeof body.id !== "string")
    )
      return json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "Invalid Request" },
        },
        400,
      );
    const id = body.id;
    if (id === undefined) return new Response(null, { status: 202 });
    const response = (result: unknown) => json({ jsonrpc: "2.0", id, result });
    if (body.method === "initialize")
      return response({
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "duka-stock", version: "1.0.0" },
        instructions:
          "Read or prepare changes; confirmation is available only in the Duka web UI. Do not claim an update is saved until the user confirms it.",
      });
    if (body.method === "ping") return response({});
    if (body.method === "tools/list") return response({ tools: TOOLS });
    if (body.method !== "tools/call")
      return json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      });
    const name = body.params?.name;
    if (!TOOLS.some((t) => t.name === name))
      return json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Unknown tool" },
      });
    const args = body.params.arguments ?? {};
    if (
      !args ||
      typeof args !== "object" ||
      Array.isArray(args) ||
      (name === "preview_stock_change"
        ? typeof args.command !== "string" ||
          Object.keys(args).some((k) => k !== "command")
        : Object.keys(args).length > 0)
    )
      return json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Invalid tool arguments" },
      });
    try {
      const result =
        name === "stock_overview"
          ? await snapshot(shop)
          : name === "list_activity"
            ? { activity: (await snapshot(shop)).activity }
            : await preview(
                shop,
                name === "prepare_reorder" ? "Prepare a reorder" : args.command,
              );
      const output =
        "reviewPath" in result && typeof result.reviewPath === "string"
          ? {
              ...result,
              reviewUrl: new URL(result.reviewPath, request.url).href,
            }
          : result;
      return response({
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
        isError: false,
      });
    } catch (e) {
      if (e instanceof StockError)
        return response({
          content: [{ type: "text", text: e.message }],
          isError: true,
        });
      throw e;
    }
  } catch (e) {
    return failure(e);
  }
}
export async function GET(request: Request) {
  try {
    shopIdentity(request);
    return Response.json(
      {
        error:
          "This MCP endpoint accepts POST requests; SSE streaming is not available.",
      },
      { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
