# Devpost draft

**Name:** Duka — Stock, spoken.

**Tagline:** A voice-first stock assistant for reviewing sales, deliveries, and reorders.

**Intended challenge:** [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/), Alexa+ track.

**Status:** Draft only. Public repository and judge setup links are entered in Devpost. The public video, personal eligibility declarations, and final terms remain incomplete.

## Inspiration

A small shopkeeper's attention belongs with customers. Updating stock can interrupt that work, especially when several products move in one sale. Duka explores a shorter interaction: say what changed, check the quantities, and confirm. A fictional Lusaka corner shop makes the demonstration concrete without using a merchant's private records.

This is a design hypothesis, not validated customer demand. A consented shopkeeper trial is next.

## What it does

Duka records sales and deliveries, answers low-stock questions, and prepares reorder drafts. “Sold three milk and two bread” produces a review of both products' before-and-after quantities. Confirmation saves the inventory and activity together.

A reorder draft lists low-stock products, quantities, suppliers, and estimated costs; its CSV can be edited outside the app. Nothing is sent to a supplier. Voice transcripts are checked before sending; typed and manual updates are alternatives.

## How we built it

React, TypeScript, Vinext, Tailwind, shadcn components, and Cloudflare D1 power the app. A stateless HTTP MCP endpoint exposes inventory, update-preview, reorder-preparation, and activity tools. The browser makes real JSON-RPC calls.

The current language layer is a deterministic parser with aliases and spoken-number support. Browser speech recognition and synthesis provide voice input/output. This is an Alexa+ web simulation, not a live Echo integration or LLM-powered assistant.

Reviews capture a shop revision. An atomic database batch prevents a stale review overwriting newer stock and prevents a repeated confirmation deducting twice. Shop identity scopes all inventory and exports.

MCP tool responses include an authenticated review link. Opening that link or refreshing the browser restores the same pending plan, without confirming it or granting access to another shop.

## Challenges

Voice needs a visible correction point. Duka separates transcript, quantity review, and confirmation. Unknown products and impossible sales produce an error instead of a guessed change.

Tool preparation is not a saved sale. The interface distinguishes pending reviews, confirmed activity, and unsent drafts so its statements agree with the database.

## Accomplishments

- A working inventory workflow with durable storage.
- Compound updates and clear quantity review.
- A real MCP boundary without a stock-confirmation tool.
- 12 passing domain tests and 24 HTTP/database checks, including concurrent edits, repeated confirmation, review recovery, and shop isolation.
- A concrete sample shop requiring no purchased hardware.

## What we learned

A useful assistant needs trustworthy state transitions as much as language interpretation. Visible review lets a person check both the transcript and its inventory effect. An unsent draft also makes the boundary between suggestion and action clear.

## What's next

Test with a shopkeeper, measure corrections and completion time, improve aliases and catalog editing, then connect authenticated Alexa+ tooling. Broader AI parsing and multilingual support should follow measured need and evaluation.

## Built with

TypeScript, React, Vinext, Cloudflare Workers, D1, Drizzle, MCP, Web Speech API, Tailwind CSS, shadcn, Lucide.

## Links to add

- Public GitHub repository with license: https://github.com/lavu1/duka-stock.
- Public English video under three minutes: **pending; script prepared**.
- Judge testing: [reproducible local setup](https://github.com/lavu1/duka-stock/blob/main/docs/judging.md). The hosted development preview is private.
- Optional friction evidence: https://github.com/lavu1/duka-stock/blob/main/submission/friction-log.md.

The [challenge resources](https://amazonappdev2026.devpost.com/resources) describe simulated web experiences for Alexa+. Recheck current rules and the submission form; this draft does not establish eligibility or guarantee acceptance.
