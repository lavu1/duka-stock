# Validation record

Checked 11 September 2026.

- 12 domain tests passed: supported grammar, number words, compound updates, rejection cases, quantity bounds, and reorder calculations.
- 18 HTTP/database integration checks passed against a built local Worker and separate D1 database: initialization, notification, tool list, sample inventory, preview without mutation, atomic update, replay, cancellation, stale plans, concurrent conflict, negative stock, unsent draft, CSV, shop isolation, origin rejection, GET behavior, unsupported version, and review header.
- TypeScript checking and targeted ESLint checks passed.
- The Sites production build completed successfully.
- The local page and stock endpoint returned HTTP 200.

This is not a browser visual review, device/microphone test, accessibility audit, external MCP conformance certification, or merchant trial. Those have not been performed.

## Isolated integration setup

Do not target `npm run dev`: its Sites plugin injects a fixed sample identity, preventing the harness from testing two identities.

Build, then initialize a **fresh** test database once:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/integration-state --config dist/server/wrangler.json --file drizzle/0000_nervous_black_queen.sql
```

Start the built Worker in one terminal:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/integration-state --ip 127.0.0.1 --port 8787 --inspector-port 0
```

In another terminal:

```sh
npm run test:integration
```

The suite defaults to http://127.0.0.1:8787, permits only localhost, and creates a random shop per run. Test data stays in the ignored `.wrangler/integration-state`. Set `DUKA_TEST_URL` to change the local port.

Before recording, check speech permission/accuracy, reload persistence, a narrow screen, and keyboard focus/labels in the actual browser. Record failures and fixes honestly. Those manual checks remain outstanding.
