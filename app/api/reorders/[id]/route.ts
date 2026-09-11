import { csv, database, failure, shopIdentity } from "@/lib/server";
import { StockError } from "@/lib/stock";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const shop = shopIdentity(request);
    const { id } = await params;
    const row = await database()
      .prepare("SELECT lines FROM reorders WHERE id=? AND shop_id=?")
      .bind(id, shop)
      .first<{ lines: string }>();
    if (!row) throw new StockError("Draft not found.", 404);
    return new Response(csv(JSON.parse(row.lines)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="duka-reorder.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
