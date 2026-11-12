import { createClient } from "npm:@supabase/supabase-js@2";

const secret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
const productId = Deno.env.get("KIWIFY_PREMIUM_PRODUCT_ID");
const offerId = Deno.env.get("KIWIFY_PREMIUM_OFFER_ID");

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!secret || !productId) return new Response(null, { status: 503 });
  if (new URL(request.url).searchParams.get("secret") !== secret) {
    return new Response(null, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return new Response(null, { status: 400 });
  if (body.Product?.product_id !== productId) return new Response(null, { status: 204 });
  if (offerId && body.Product?.product_offer_id !== offerId) {
    return new Response(null, { status: 204 });
  }

  const status = body.order_status;
  const revoke = status === "refunded" || status === "chargedback" ||
    body.webhook_event_type === "order_refunded" ||
    body.webhook_event_type === "chargeback";
  if (status !== "paid" && !revoke) return new Response(null, { status: 204 });
  const id = body.order_id;
  const email = body.Customer?.email;
  const rawDate = body.approved_date;
  const approval = typeof rawDate === "string"
    ? new Date(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(rawDate) ? rawDate.replace(" ", "T") + "Z" : rawDate)
    : null;
  if (
    typeof id !== "string" || !id || id.length > 128 ||
    typeof email !== "string" || email.length > 254 || !email.includes("@") ||
    (!revoke && (!approval || !Number.isFinite(approval.getTime())))
  ) return new Response(null, { status: 400 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await db.rpc("record_simulator_purchase", {
    purchase_id: id,
    email,
    approval: revoke ? null : approval!.toISOString(),
    revoke_access: revoke,
  });
  return new Response(null, { status: error ? 500 : 204 });
});
