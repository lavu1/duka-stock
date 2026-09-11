import { env } from "cloudflare:workers";
import {
  SAMPLE_PRODUCTS,
  StockError,
  parseCommand,
  planChanges,
  reorderLines,
  type Snapshot,
  type Plan,
  type ReorderLine,
} from "./stock";
export function database() {
  if (!env.DB)
    throw new StockError(
      "Stock storage is temporarily unavailable. Please try again.",
      503,
    );
  return env.DB;
}
export function shopIdentity(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    throw new StockError("This request must come from Duka.", 403);
  const user = request.headers.get("oai-authenticated-user-id");
  if (user) return user;
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    return "local-demo";
  throw new StockError("Sign in to open your shop.", 401);
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof StockError)
    return json({ error: error.message }, error.status);
  console.error(
    "Duka storage request failed",
    error instanceof Error ? error.message : "Unknown failure",
  );
  return json(
    {
      error:
        "We couldn't save or load your stock. Your input is still here; please try again.",
    },
    503,
  );
}
export async function bodyOf(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new StockError("Expected a JSON request.", 415);
  const text = await request.text();
  if (text.length > 8192) throw new StockError("Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new StockError("Invalid JSON.");
  }
}
async function ensureShop(shop: string) {
  const db = database();
  if (await db.prepare("SELECT id FROM shops WHERE id=?").bind(shop).first())
    return;
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO shops(id,revision) VALUES(?,0)")
      .bind(shop),
    ...SAMPLE_PRODUCTS.map((p) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO stock(shop_id,product_id,quantity) VALUES(?,?,?)",
        )
        .bind(shop, p.id, p.quantity),
    ),
  ]);
}
export async function snapshot(shop: string): Promise<Snapshot> {
  await ensureShop(shop);
  const db = database();
  const results = await db.batch([
    db.prepare("SELECT revision FROM shops WHERE id=?").bind(shop),
    db
      .prepare("SELECT product_id,quantity FROM stock WHERE shop_id=?")
      .bind(shop),
    db
      .prepare(
        "SELECT id,title,detail,kind,created_at AS createdAt FROM activities WHERE shop_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
      )
      .bind(shop),
    db
      .prepare(
        "SELECT id,lines,created_at AS createdAt FROM reorders WHERE shop_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
      )
      .bind(shop),
  ]);
  const counts = new Map(
    (results[1].results as { product_id: string; quantity: number }[]).map(
      (x) => [x.product_id, x.quantity],
    ),
  );
  return {
    revision: (results[0].results[0] as { revision: number }).revision,
    products: SAMPLE_PRODUCTS.map((p) => ({
      ...p,
      quantity: counts.get(p.id) ?? 0,
    })),
    activity: results[2].results as Snapshot["activity"],
    reorders: (
      results[3].results as { id: string; lines: string; createdAt: number }[]
    ).map((r) => ({ ...r, lines: JSON.parse(r.lines), status: "draft" })),
  };
}
export async function preview(shop: string, command: string) {
  const state = await snapshot(shop);
  const intent = parseCommand(command, state.products);
  if (intent.kind === "overview" || intent.kind === "low") {
    const products =
      intent.kind === "low"
        ? state.products.filter((p) => p.quantity <= p.minimum)
        : state.products;
    return {
      kind: "answer",
      message:
        intent.kind === "low"
          ? `${products.length} product${products.length === 1 ? " is" : "s are"} at or below the restock level.`
          : `You have ${products.reduce((n, p) => n + p.quantity, 0)} units across ${products.length} products.`,
      products,
    };
  }
  const changes =
    intent.kind === "adjust" ? planChanges(intent, state.products) : [];
  const lines = intent.kind === "reorder" ? reorderLines(state.products) : [];
  if (intent.kind === "reorder" && !lines.length)
    return {
      kind: "answer",
      message: "Everything is above its restock level. No reorder is needed.",
      products: [],
    };
  const plan: Plan = {
    id: crypto.randomUUID(),
    kind: intent.kind,
    title:
      intent.kind === "reorder"
        ? "Prepare a reorder draft"
        : `Update ${changes.length} product${changes.length === 1 ? "" : "s"}`,
    transcript: command,
    changes,
    lines,
    expiresAt: Date.now() + 600000,
    status: "pending",
  };
  await database()
    .prepare(
      "INSERT INTO plans(id,shop_id,revision,body,status,expires_at) VALUES(?,?,?,?,?,?)",
    )
    .bind(
      plan.id,
      shop,
      state.revision,
      JSON.stringify(plan),
      "pending",
      plan.expiresAt,
    )
    .run();
  return {
    kind: "plan",
    reviewPath: `/?review=${plan.id}`,
    message:
      intent.kind === "reorder"
        ? "Review the quantities below. This saves a draft; it does not contact or pay a supplier."
        : "Review this change before I update your stock.",
    plan,
  };
}
// Recover exactly one review by its opaque ID; the URL is not an authorization token.
export async function readReview(
  shop: string,
  id: string | null,
): Promise<Plan> {
  if (!id || !/^[a-f0-9-]{36}$/i.test(id))
    throw new StockError("Invalid review link.", 400);
  const row = await database()
    .prepare(
      "SELECT p.body,p.status,p.expires_at,p.revision,s.revision AS current_revision FROM plans p JOIN shops s ON s.id=p.shop_id WHERE p.id=? AND p.shop_id=?",
    )
    .bind(id, shop)
    .first<{
      body: string;
      status: string;
      expires_at: number;
      revision: number;
      current_revision: number;
    }>();
  if (!row)
    throw new StockError("This review could not be found in your shop.", 404);
  if (row.status === "applied")
    throw new StockError(
      "This review was already saved. Your stock has not changed again.",
      409,
    );
  if (row.status !== "pending")
    throw new StockError(
      "This review was cancelled. Ask Duka for a new review.",
      409,
    );
  if (row.expires_at < Date.now())
    throw new StockError(
      "This review expired. Ask Duka for current quantities.",
      409,
    );
  if (row.revision !== row.current_revision)
    throw new StockError(
      "Stock changed after this review was prepared. Ask Duka for a fresh review.",
      409,
    );
  return JSON.parse(row.body) as Plan;
}

export async function resolvePlan(
  shop: string,
  id: string,
  action: "confirm" | "cancel",
) {
  if (typeof id !== "string" || id.length > 100)
    throw new StockError("Invalid review.");
  const db = database();
  const row = await db
    .prepare(
      "SELECT id,revision,body,status,expires_at FROM plans WHERE id=? AND shop_id=?",
    )
    .bind(id, shop)
    .first<{
      id: string;
      revision: number;
      body: string;
      status: string;
      expires_at: number;
    }>();
  if (!row) throw new StockError("This review could not be found.", 404);
  if (row.status === "applied")
    return {
      message: "Already saved. Your stock was not changed again.",
      state: await snapshot(shop),
    };
  if (action === "cancel") {
    await db
      .prepare(
        "UPDATE plans SET status='cancelled' WHERE id=? AND shop_id=? AND status='pending'",
      )
      .bind(id, shop)
      .run();
    return {
      message: "Cancelled. Nothing was changed.",
      state: await snapshot(shop),
    };
  }
  if (row.status !== "pending")
    throw new StockError("This review was cancelled. Ask Duka again.", 409);
  if (row.expires_at < Date.now())
    throw new StockError(
      "This review expired. Ask Duka again for current stock.",
      409,
    );
  const plan = JSON.parse(row.body) as Plan;
  const time = Date.now();
  // Claim and all effects share one atomic D1 batch. Every effect requires a successful claim.
  // A stale plan or retry cannot mutate stock, create an extra draft, or duplicate the activity.
  const statements = [
    db
      .prepare(
        "UPDATE plans SET status='applying' WHERE id=? AND shop_id=? AND status='pending' AND expires_at>=? AND revision=(SELECT revision FROM shops WHERE id=?)",
      )
      .bind(id, shop, time, shop),
  ];
  if (plan.kind === "adjust")
    for (const c of plan.changes)
      statements.push(
        db
          .prepare(
            "UPDATE stock SET quantity=? WHERE shop_id=? AND product_id=? AND EXISTS(SELECT 1 FROM plans WHERE id=? AND status='applying')",
          )
          .bind(c.after, shop, c.productId, id),
      );
  if (plan.kind === "reorder")
    statements.push(
      db
        .prepare(
          "INSERT INTO reorders(id,shop_id,lines,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM plans WHERE id=? AND status='applying')",
        )
        .bind(id, shop, JSON.stringify(plan.lines), time, id),
    );
  const detail =
    plan.kind === "adjust"
      ? plan.changes
          .map((c) => `${c.name}: ${c.before} → ${c.after}`)
          .join(" · ")
      : `${plan.lines.length} products · draft only, not sent`;
  statements.push(
    db
      .prepare(
        "INSERT INTO activities(id,shop_id,title,detail,kind,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM plans WHERE id=? AND status='applying')",
      )
      .bind(id, shop, plan.title, detail, plan.kind, time, id),
  );
  statements.push(
    db
      .prepare(
        "UPDATE shops SET revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM plans WHERE id=? AND status='applying')",
      )
      .bind(shop, id),
  );
  statements.push(
    db
      .prepare(
        "UPDATE plans SET status='applied' WHERE id=? AND shop_id=? AND status='applying'",
      )
      .bind(id, shop),
  );
  const results = await db.batch(statements);
  if (!results[0].meta.changes) {
    const current = await db
      .prepare("SELECT status FROM plans WHERE id=? AND shop_id=?")
      .bind(id, shop)
      .first<{ status: string }>();
    if (current?.status !== "applied")
      throw new StockError(
        "Your stock changed while this review was open. Ask Duka again to use the latest quantities.",
        409,
      );
  }
  return {
    message:
      plan.kind === "adjust"
        ? "Stock updated. Your change is saved in Activity."
        : "Reorder draft saved. No supplier has been contacted.",
    state: await snapshot(shop),
  };
}
export function csv(rows: ReorderLine[]) {
  const safe = (v: string | number) =>
    '"' +
    String(v)
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  return [
    "Product,Quantity,Unit cost ZMW,Estimated total ZMW,Supplier",
    ...rows.map((r) =>
      [
        r.name,
        r.quantity,
        (r.cost / 100).toFixed(2),
        ((r.quantity * r.cost) / 100).toFixed(2),
        r.supplier,
      ]
        .map(safe)
        .join(","),
    ),
  ].join("\r\n");
}
