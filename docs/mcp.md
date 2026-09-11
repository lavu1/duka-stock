# MCP surface

`POST /api/mcp` implements stateless JSON-RPC using the Streamable HTTP JSON response path and protocol version `2025-11-25`. The browser initializes, sends the initialized notification, then calls tools. No SSE stream, session resumption, or server-initiated request is offered. GET returns 405.

| Tool                   | Input                       | Result                                |
| ---------------------- | --------------------------- | ------------------------------------- |
| `stock_overview`       | `{}`                        | Inventory, activity, drafts, revision |
| `preview_stock_change` | `{"command":"Sold 3 milk"}` | Pending review or read-only answer    |
| `prepare_reorder`      | `{}`                        | Pending reorder review                |
| `list_activity`        | `{}`                        | Up to 100 confirmed events            |

## Local request

Run the local server first. Development defaults to port 5173.

```sh
curl http://localhost:5173/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"duka-local","version":"1.0"}}}'

curl http://localhost:5173/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","method":"notifications/initialized"}'

curl http://localhost:5173/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"preview_stock_change","arguments":{"command":"Sold 3 milk"}}}'
```

A tool response includes `reviewUrl`. Open it in the same authenticated shop to recover and confirm that exact plan. Refreshing keeps the review. The URL does not grant access to other shops. Cancelled, applied, expired, and stale plans cannot be reopened as pending. External Alexa+ authentication remains future work.

## Draft instructions for a future Alexa+ connection

> Read stock and prepare updates using the tools. Repeat proposed quantities and direct the user to Duka's review screen. Do not say stock has changed before confirmation. Treat reorders as unsent drafts. Ask about ambiguous products. Never invent inventory, contact a supplier, or initiate payment.

This is an integration prompt draft, not an installed Alexa skill.

References: [MCP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [challenge resources](https://amazonappdev2026.devpost.com/resources).
