# Developer-friction log

Evidence log, not a bonus claim. No Echo device, Alexa developer account, Amazon SDK, or external Alexa+ client was tested. Do not relabel app bugs as Amazon platform feedback.

| Date       | Observation                                                                               | Action/evidence                                                                    | Scope                                    |
| ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-09-11 | Challenge resources describe a simulated web experience path.                             | Built and labeled the simulation. https://amazonappdev2026.devpost.com/resources   | Documentation; not a device test         |
| 2026-09-11 | The MCP browser client needed explicit initialization and notification before tool calls. | Implemented lifecycle; both checks passed.                                         | MCP implementation                       |
| 2026-09-11 | The dev server injects one identity, invalidating a two-shop header-based test.           | Ran the suite against a built Worker with separate test storage; isolation passed. | Test infrastructure; not Amazon feedback |
| 2026-09-11 | Two reviews of the same inventory can conflict.                                           | Atomic revision-checked claim; exactly one conflicting confirmation succeeds.      | Application correctness                  |

## Future Alexa+ feedback

For each actual issue record: date, tool/SDK/version, expected result, steps, observed behavior, redacted evidence, workaround/result, and improvement suggestion. Do not fabricate device tests or contact with organizers.

## Shopkeeper trial — not conducted

With consent, record the task, phrase, transcript correction, completion time, and whether the stock change was understood. Use sample data. Do not record names or audio without specific agreement. Report sample size and limitations with any metric.
