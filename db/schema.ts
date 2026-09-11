import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
export const stock = sqliteTable(
  "stock",
  {
    shopId: text("shop_id").notNull(),
    productId: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.shopId, t.productId] })],
);
export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull(),
    revision: integer("revision").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("idx_plans_shop").on(t.shopId)],
);
export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    kind: text("kind").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_activities_shop_time").on(t.shopId, t.createdAt)],
);
export const reorders = sqliteTable(
  "reorders",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull(),
    lines: text("lines").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_reorders_shop_time").on(t.shopId, t.createdAt)],
);
