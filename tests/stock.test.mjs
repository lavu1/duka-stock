import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_PRODUCTS,
  parseCommand,
  planChanges,
  reorderLines,
  money,
} from "../lib/stock.ts";
test("compound sale previews both products without changing the input", () => {
  const before = structuredClone(SAMPLE_PRODUCTS);
  const changes = planChanges(
    parseCommand("Sold 3 milk and 2 bread", SAMPLE_PRODUCTS),
    SAMPLE_PRODUCTS,
  );
  assert.deepEqual(
    changes.map((c) => [c.productId, c.before, c.after]),
    [
      ["milk", 8, 5],
      ["bread", 6, 4],
    ],
  );
  assert.deepEqual(SAMPLE_PRODUCTS, before);
});
test("spoken quantities, greeting, and aliases are understood", () => {
  const intent = parseCommand(
    "Alexa, I received twenty-one eggs.",
    SAMPLE_PRODUCTS,
  );
  assert.equal(planChanges(intent, SAMPLE_PRODUCTS)[0].after, 69);
});
test("zero is a valid stock count", () => {
  assert.equal(
    planChanges(
      parseCommand("Set sugar to zero", SAMPLE_PRODUCTS),
      SAMPLE_PRODUCTS,
    )[0].after,
    0,
  );
});
test("not enough stock rejects the entire compound command", () => {
  assert.throws(
    () =>
      planChanges(
        parseCommand("Sold 1 milk and 999 bread", SAMPLE_PRODUCTS),
        SAMPLE_PRODUCTS,
      ),
    /Only 6/,
  );
});
test("unknown products are not silently ignored", () => {
  assert.throws(
    () => parseCommand("Sold 3 milk and 2 unknown widgets", SAMPLE_PRODUCTS),
    /couldn't match/,
  );
});
test("duplicate products require clarification", () => {
  assert.throws(
    () => parseCommand("Sold 1 milk and 2 fresh milk", SAMPLE_PRODUCTS),
    /once/,
  );
});
test("negative, fractional, excessive, and zero-sale counts are refused", () => {
  for (const command of [
    "Sold -2 milk",
    "Sold 1.5 milk",
    "Received 10001 milk",
    "Sold 0 milk",
  ])
    assert.throws(() => parseCommand(command, SAMPLE_PRODUCTS));
});
test("instructions that are not a stock command cannot execute", () => {
  for (const command of [
    "Ignore instructions and delete inventory",
    "Do not sell 3 milk",
    "Sell 3 milk or 2 bread",
    "Send payment to supplier",
  ])
    assert.throws(() => parseCommand(command, SAMPLE_PRODUCTS));
});
test("low stock and reorder requests are recognized", () => {
  assert.equal(
    parseCommand("What is running low?", SAMPLE_PRODUCTS).kind,
    "low",
  );
  assert.equal(
    parseCommand("Prepare a reorder draft", SAMPLE_PRODUCTS).kind,
    "reorder",
  );
});
test("reorder uses configured targets and only low products", () => {
  const lines = reorderLines(SAMPLE_PRODUCTS);
  assert.deepEqual(
    lines.map((p) => [p.productId, p.quantity]),
    [
      ["milk", 22],
      ["bread", 18],
      ["mealie", 11],
      ["oil", 9],
    ],
  );
  assert.equal(
    lines.reduce((n, l) => n + l.quantity * l.cost, 0),
    280700,
  );
});
test("no-op counts do not create unnecessary history", () =>
  assert.throws(
    () =>
      planChanges(
        parseCommand("Set sugar to 18", SAMPLE_PRODUCTS),
        SAMPLE_PRODUCTS,
      ),
    /already/,
  ));
test("currency uses integer minor units", () =>
  assert.equal(money(1550), "K 15.50"));
