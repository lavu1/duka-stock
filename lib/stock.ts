export type Product = {
  id: string;
  name: string;
  pack: string;
  category: string;
  sku: string;
  quantity: number;
  minimum: number;
  target: number;
  price: number;
  cost: number;
  supplier: string;
  aliases: string[];
};
export type Change = {
  productId: string;
  name: string;
  before: number;
  after: number;
  delta: number;
};
export type ReorderLine = {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
  supplier: string;
};
export type Plan = {
  id: string;
  kind: "adjust" | "reorder";
  title: string;
  transcript: string;
  changes: Change[];
  lines: ReorderLine[];
  expiresAt: number;
  status: string;
};
export type Activity = {
  id: string;
  title: string;
  detail: string;
  createdAt: number;
  kind: string;
};
export type Reorder = {
  id: string;
  lines: ReorderLine[];
  createdAt: number;
  status: "draft";
};
export type Snapshot = {
  products: Product[];
  activity: Activity[];
  reorders: Reorder[];
  revision: number;
};
export type Intent = {
  kind: "overview" | "low" | "reorder" | "adjust";
  changes?: {
    productId: string;
    mode: "sell" | "receive" | "set";
    amount: number;
  }[];
};
export class StockError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "StockError";
  }
}
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "milk",
    name: "Fresh milk",
    pack: "1 litre",
    category: "Dairy",
    sku: "DK-001",
    quantity: 8,
    minimum: 10,
    target: 30,
    price: 2800,
    cost: 2200,
    supplier: "Morning Fresh",
    aliases: ["milk", "fresh milk"],
  },
  {
    id: "bread",
    name: "White bread",
    pack: "700 g loaf",
    category: "Bakery",
    sku: "DK-002",
    quantity: 6,
    minimum: 8,
    target: 24,
    price: 2000,
    cost: 1550,
    supplier: "Sunrise Bakery",
    aliases: ["bread", "white bread", "loaf", "loaves", "loaves of bread"],
  },
  {
    id: "eggs",
    name: "Eggs",
    pack: "Single egg",
    category: "Dairy",
    sku: "DK-003",
    quantity: 48,
    minimum: 18,
    target: 60,
    price: 350,
    cost: 250,
    supplier: "Morning Fresh",
    aliases: ["eggs", "egg"],
  },
  {
    id: "mealie",
    name: "Mealie meal",
    pack: "10 kg bag",
    category: "Pantry",
    sku: "DK-004",
    quantity: 5,
    minimum: 6,
    target: 16,
    price: 14500,
    cost: 12200,
    supplier: "City Wholesale",
    aliases: ["mealie meal", "mealie", "maize meal"],
  },
  {
    id: "sugar",
    name: "White sugar",
    pack: "2 kg bag",
    category: "Pantry",
    sku: "DK-005",
    quantity: 18,
    minimum: 8,
    target: 30,
    price: 5800,
    cost: 4900,
    supplier: "City Wholesale",
    aliases: ["sugar", "white sugar"],
  },
  {
    id: "oil",
    name: "Cooking oil",
    pack: "2 litre bottle",
    category: "Pantry",
    sku: "DK-006",
    quantity: 3,
    minimum: 5,
    target: 12,
    price: 9500,
    cost: 7800,
    supplier: "City Wholesale",
    aliases: ["oil", "cooking oil"],
  },
  {
    id: "rice",
    name: "Long grain rice",
    pack: "2 kg bag",
    category: "Pantry",
    sku: "DK-007",
    quantity: 15,
    minimum: 6,
    target: 24,
    price: 5200,
    cost: 4100,
    supplier: "City Wholesale",
    aliases: ["rice", "long grain rice"],
  },
  {
    id: "soap",
    name: "Laundry soap",
    pack: "250 g bar",
    category: "Household",
    sku: "DK-008",
    quantity: 24,
    minimum: 10,
    target: 36,
    price: 1200,
    cost: 850,
    supplier: "Home Essentials",
    aliases: ["soap", "laundry soap"],
  },
  {
    id: "water",
    name: "Drinking water",
    pack: "500 ml bottle",
    category: "Drinks",
    sku: "DK-009",
    quantity: 42,
    minimum: 12,
    target: 60,
    price: 800,
    cost: 500,
    supplier: "Clear Water",
    aliases: ["water", "drinking water", "bottled water"],
  },
  {
    id: "tea",
    name: "Black tea",
    pack: "100 bags",
    category: "Drinks",
    sku: "DK-010",
    quantity: 12,
    minimum: 5,
    target: 20,
    price: 3500,
    cost: 2700,
    supplier: "City Wholesale",
    aliases: ["tea", "black tea", "tea bags"],
  },
];
export function money(cents: number) {
  return `K ${new Intl.NumberFormat("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)}`;
}
export function stockStatus(p: Product) {
  return p.quantity === 0
    ? "Out of stock"
    : p.quantity <= p.minimum
      ? "Running low"
      : "In stock";
}
const numbers: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
function numberWords(input: string) {
  return input
    .replace(
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g,
      (_, a, b) => String(numbers[a] + numbers[b]),
    )
    .replace(
      /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
      (w) => String(numbers[w]),
    );
}
function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[?!.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function resolveProduct(raw: string, products: Product[]) {
  const name = normalize(raw).replace(
    /^(?:of |units? of |bottles? of |bags? of |bars? of )/,
    "",
  );
  const found = products.filter((p) =>
    [p.id, p.name, p.sku, ...p.aliases].some((a) => normalize(a) === name),
  );
  if (found.length !== 1)
    throw new StockError(
      `I couldn't match “${raw}” to one product. Use its exact name from your stock list.`,
    );
  return found[0];
}
export function parseCommand(input: string, products: Product[]): Intent {
  if (typeof input !== "string" || input.length > 500 || !input.trim())
    throw new StockError("Enter a stock update of 1–500 characters.");
  const text = numberWords(normalize(input))
    .replace(/^(?:hey |hi )?(?:duka|alexa)[, ]+/, "")
    .replace(/^(?:please |i |we )/, "")
    .replace(/\s+please$/, "");
  if (
    /^(?:(?:what(?:'s| is)|show(?: me)?|which (?:items|products)(?: are)?) )?(?:running low|low stock|low|needs? restocking)(?: items| products)?$/.test(
      text,
    ) ||
    text === "what should i restock"
  )
    return { kind: "low" };
  if (
    /^(?:show(?: me)? (?:my |the )?(?:stock|inventory)|stock overview|check (?:my )?stock|inventory)$/.test(
      text,
    )
  )
    return { kind: "overview" };
  if (
    /^(?:(?:prepare|create|make|draft) (?:a |my |the )?)?(?:reorder|restock)(?: draft| list| order)?(?: for low stock| for low-stock items| for low items)?$/.test(
      text,
    )
  )
    return { kind: "reorder" };
  const chunks = text.split(/\s+and\s+|\s*;\s*|,\s*/);
  if (chunks.length > 10)
    throw new StockError("Update up to 10 products at a time.");
  let lastMode: "sell" | "receive" | "set" | undefined;
  const changes = chunks.map((chunk) => {
    let mode = lastMode;
    const verb = chunk.match(
      /^(sold|sell|received|receive|add|added|set|count|counted)\s+/,
    );
    if (verb) {
      mode = /sold|sell/.test(verb[1])
        ? "sell"
        : /set|count/.test(verb[1])
          ? "set"
          : "receive";
      chunk = chunk.slice(verb[0].length);
    }
    if (!mode)
      throw new StockError(
        "Try “Sold 3 milk”, “Received 12 bread”, “Set sugar to 10”, or “What is running low?”",
      );
    lastMode = mode;
    const set =
      mode === "set" ? chunk.match(/^(.+?)\s+(?:to|at)\s+(\d+)$/) : null;
    const numeric = chunk.match(/^(\d+)\s+(.+)$/);
    let rawName: string, amount: number;
    if (set) {
      rawName = set[1];
      amount = Number(set[2]);
    } else if (numeric) {
      amount = Number(numeric[1]);
      rawName = numeric[2];
    } else
      throw new StockError(
        "Use whole units and a product name, for example “Sold 3 milk”.",
      );
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 10000 ||
      (mode !== "set" && amount === 0)
    )
      throw new StockError(
        "Use 1–10,000 whole units, or zero for a stock count.",
      );
    return { productId: resolveProduct(rawName, products).id, mode, amount };
  });
  if (new Set(changes.map((c) => c.productId)).size !== changes.length)
    throw new StockError(
      "Mention each product once so the change is unambiguous.",
    );
  return { kind: "adjust", changes };
}
export function planChanges(intent: Intent, products: Product[]): Change[] {
  return (intent.changes ?? []).map((c) => {
    const p = products.find((p) => p.id === c.productId);
    if (!p)
      throw new StockError(
        "That product no longer exists. Refresh your stock.",
      );
    const after =
      c.mode === "set"
        ? c.amount
        : p.quantity + (c.mode === "sell" ? -c.amount : c.amount);
    if (after < 0)
      throw new StockError(
        `Only ${p.quantity} ${p.name} are in stock. Check the quantity before recording this sale.`,
      );
    if (after > 100000)
      throw new StockError("The resulting stock count is too large.");
    if (after === p.quantity)
      throw new StockError(
        `${p.name} is already at ${after}. No change is needed.`,
      );
    return {
      productId: p.id,
      name: p.name,
      before: p.quantity,
      after,
      delta: after - p.quantity,
    };
  });
}
export function reorderLines(products: Product[]): ReorderLine[] {
  return products
    .filter((p) => p.quantity <= p.minimum)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      quantity: Math.max(0, p.target - p.quantity),
      cost: p.cost,
      supplier: p.supplier,
    }))
    .filter((p) => p.quantity > 0);
}
