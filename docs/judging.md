# Judge testing guide

Duka is an Alexa+ **web simulation**, developed with coding-agent assistance. Its runtime uses browser speech and a deterministic parser with real MCP tools. It does not connect to an Echo device or an LLM.

## Run the full demo without an account or API key

```sh
git clone https://github.com/lavu1/duka-stock.git
cd duka-stock
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_nervous_black_queen.sql
npm run dev
```

Open http://localhost:5173. The initial SQL is for a fresh database; do not run it twice on the same database. This is a local sample shop, not a real merchant account. No paid service, Alexa hardware, or Cloudflare account is required.

## A two-minute functional check

1. Type `Sold 3 milk and 2 bread`. The review must show milk 8 → 5 and bread 6 → 4 in a fresh shop.
2. **Reload before confirming.** The same pending review is restored from the database using its URL.
3. Confirm. Quantities update together and the URL clears the review ID.
4. Open Activity; the compound change appears once. Reloading retains the quantities.
5. Type `Sold 999 milk`. The whole request is refused without altering inventory.
6. Ask what is running low, prepare a reorder, review it, and save a draft.
7. Open Reorders and download the CSV. No supplier has been contacted.

Voice is optional: use a compatible browser, allow the microphone if desired, check the transcript, then send. Typed input covers the full workflow if speech support is unavailable.

## Independently verify the data boundary

After building:

```sh
npm test
npm run typecheck
npm run test:integration:isolated
```

The last command creates its own disposable database and Worker, runs the HTTP suite, and cleans up. It does not touch the normal sample shop. The GitHub Actions workflow runs these checks for contributions.

See [MCP protocol usage](mcp.md), [architecture](architecture.md), and [validation limitations](validation.md). Hosted owner-private development previews are not required to reproduce the project; use this repository for judge testing.

The final public video is still pending and must be added to Devpost before submission.
