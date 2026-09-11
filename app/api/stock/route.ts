import { failure, json, shopIdentity, snapshot } from "@/lib/server";
export async function GET(request: Request) {
  try {
    return json(await snapshot(shopIdentity(request)));
  } catch (e) {
    return failure(e);
  }
}
