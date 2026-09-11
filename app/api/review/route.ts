import {
  bodyOf,
  failure,
  json,
  resolvePlan,
  readReview,
  shopIdentity,
} from "@/lib/server";
import { StockError } from "@/lib/stock";
export async function POST(request: Request) {
  try {
    const shop = shopIdentity(request);
    const body = await bodyOf(request);
    if (body?.action !== "confirm" && body?.action !== "cancel")
      throw new StockError("Choose confirm or cancel.");
    if (request.headers.get("x-duka-review") !== "1")
      throw new StockError("Review this change in Duka first.", 403);
    return json(await resolvePlan(shop, body.id, body.action));
  } catch (e) {
    return failure(e);
  }
}

export async function GET(request: Request) {
  try {
    const shop = shopIdentity(request);
    return json({
      plan: await readReview(shop, new URL(request.url).searchParams.get("id")),
    });
  } catch (error) {
    return failure(error);
  }
}
