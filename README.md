# Duka — Stock, spoken.

[![Verify Duka](https://github.com/lavu1/duka-stock/actions/workflows/verify.yml/badge.svg)](https://github.com/lavu1/duka-stock/actions/workflows/verify.yml)

[Judge testing guide](docs/judging.md) · [MCP integration](docs/mcp.md) · [MIT license](LICENSE)

A working voice-and-text stock assistant for a small shop. Record sales and deliveries, check low stock, and prepare reorder drafts. Every stock change requires explicit review. Products, suppliers, and prices are fictional sample data for a Lusaka corner shop.

Built as an **Alexa+ web simulation** for the Build, Ship, Shape: Amazon Developer Hackathon. This version uses browser speech recognition, a deterministic command parser, and a real HTTP MCP tool endpoint. It is not connected to Alexa, an Echo device, an LLM, or a supplier.

## Try it

1. Type `Sold 3 milk and 2 bread`.
2. Check the before-and-after quantities, then choose **Confirm update**.
3. Type `Received twelve bread` and confirm.
4. Ask `What is running low?`, then choose **Reorder draft**.
5. Review and save the draft. Open **Reorders** to download its CSV.
6. Open **Activity** to see confirmed changes. Reloading preserves the shop.

The microphone writes a transcript into the input. Check it before sending. Browser support varies, so typed commands and manual product updates are also available. Voice recognition may send audio to the browser vendor's speech service.

## Run locally

Requires Node.js 22.13 or later and npm.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_nervous_black_queen.sql
npm run dev
```

Open http://localhost:5173. Run the initial SQL **once for a fresh local database**. The Sites development server supplies a sample signed-in identity. No model API key is needed.

Sites handles hosted builds and generated D1 migrations. The logical binding in `.openai/hosting.json` is `DB`; do not replace it with a Cloudflare database ID. Preserve the supplied Vite plugin and build infrastructure.

## Project map

| Location                   | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `components/shop.tsx`      | Inventory, voice input, review, drafts, activity     |
| `lib/stock.ts`             | Catalog, command grammar, quantities, reorder rules  |
| `lib/server.ts`            | Identity, persistence, atomic confirmation           |
| `app/api/mcp/route.ts`     | MCP initialization and four tools                    |
| `db/schema.ts`, `drizzle/` | Schema and generated migration                       |
| `tests/`                   | Domain tests and isolated Worker integration checks  |
| `docs/`                    | Architecture, protocol usage, validation             |
| `submission/`              | Devpost draft, video script, friction log, checklist |

## Verify

```sh
npm test
npm run typecheck
npm run build
npm run test:integration:isolated
```

For HTTP/database checks, follow [the isolated test setup](docs/validation.md). They change sample stock and must not target real data or the usual development preview.

## Current boundaries

- English stock commands, whole units, ten sample products. Catalog editing, offline use, roles, and supplier integrations remain future work.
- Reviews expire after ten minutes. Conflicting updates require a fresh review. Replaying a successful confirmation cannot deduct stock twice.
- Orders are unsent drafts; no payments or supplier messages are made.
- Hosted access uses Sites account authentication. Tool responses provide a refresh-safe review link. An external Alexa client still needs supported authentication.
- No merchant trial, microphone/device compatibility study, public video, or final Devpost submission is claimed complete.

Project code is MIT licensed. Bundled dependencies retain their licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
