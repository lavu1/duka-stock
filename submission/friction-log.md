# Developer-friction log

Observed on 11 September 2026 while building Duka's simulated Alexa+ experience. These reports concern the web/MCP prototype and its test tooling. No Amazon device, SDK, or external Alexa+ client was tested. They do not establish entitlement to a judging bonus.

## 1. Pending reviews disappeared on refresh

- **Task attempted:** prepare a compound sale, pause, then return to review it.
- **Steps:** type a sale in the initial browser prototype; wait for the pending review; reload the page.
- **Expected:** recover the pending quantities without applying the sale.
- **Observed before fix:** the database retained the pending plan, but the interface's in-memory review disappeared. A plan prepared by a separate MCP caller also had no usable browser handoff.
- **Severity:** Important; interrupts the boundary between a suggested action and human confirmation.
- **Workaround:** re-enter the command and generate another plan.
- **Action:** return a review URL from the MCP tool, load the exact persisted plan through an authenticated GET endpoint, retain the review ID in the page URL, and clear it after confirmation/cancellation.
- **Result:** a browser refresh restored the same milk/bread quantities; confirmation saved the compound change. HTTP checks verify ownership, malformed IDs, applied plans, and stale plans.
- **Suggestion:** agent integrations should include an authenticated, refresh-safe review destination in their tool result when a human must confirm. A link must never itself grant access.

## 2. The mobile command box was below the response history

- **Task attempted:** enter another stock update on a narrow screen.
- **Steps:** open the original layout with a saved response in a compact viewport.
- **Expected:** see and reach the primary command input without scrolling through the previous answer.
- **Observed before fix:** a tall microphone panel plus the response pushed the input below the initial viewport.
- **Severity:** Important; makes the main workflow harder to find.
- **Workaround:** scroll past the response.
- **Action:** put the composer before responses and use a compact microphone/header arrangement on smaller screens.
- **Result:** the command input was visible in the checked 390 × 844 phone-sized layout and the 1280 × 900 desktop layout.
- **Suggestion:** voice/text simulations should preserve a visible text fallback even when speech is the headline interaction.

## 3. Development identity invalidated the isolation test

- **Task attempted:** verify that one shop cannot read or confirm another shop's review.
- **Steps:** send two different test identity headers to the normal Sites development server.
- **Expected:** separate test shops.
- **Observed:** the development plugin supplies one sample identity, so the harness was exercising the same shop twice.
- **Severity:** Important for trustworthy verification; not an observed production isolation failure.
- **Workaround/action:** run the built Worker against a separate local D1 database. The standalone test runner now creates and cleans up a disposable database automatically.
- **Result:** cross-shop review, confirmation, and export checks passed in the isolated Worker.
- **Suggestion:** document fixed development identities next to multi-user testing examples and keep integration verification independent from the user-facing preview.

## Device and user research still to do

For actual Alexa+ onboarding, record the tool/version, expected result, reproducible steps, redacted evidence, severity, workaround, and concrete suggestion. For a consented shopkeeper trial, report the actual task, correction, completion time, sample size, and limitations. No device tests, merchant testimonials, organizer contacts, or speech-accuracy metrics have been invented.
