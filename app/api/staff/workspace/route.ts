import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  if (!url || !anon || !service) throw new Error("Staff workspace is not configured.");
  return { apikey: service, ...(service.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${service}` }), "Content-Type": "application/json" };
}
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  const raw = await response.text(); const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.message || "Staff workspace data request failed.");
  return data;
}
async function requireStaff(request: Request) {
  if (!url || !anon) throw new Error("Supabase authentication is not configured.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Please sign in to your KAOMA staff workspace.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Your staff session expired. Please sign in again.");
  const user = await response.json() as { id: string; email?: string };
  const rows = await db(`staff_members?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,email,full_name,role_key,permissions,status&limit=1`);
  if (!rows?.length || rows[0].status !== "active") throw new Error("Your KAOMA staff account is not active.");
  return { user, staff: rows[0] as { user_id: string; email: string; full_name: string | null; role_key: string; permissions: Record<string, boolean>; status: string } };
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to access the staff workspace.";
  return NextResponse.json({ error: message }, { status: /session expired|sign in/i.test(message) ? 401 : /not active/i.test(message) ? 403 : 500 });
}
export async function GET(request: Request) {
  try {
    const { user, staff } = await requireStaff(request);
    const permissions = staff.permissions || {};
    const [orders, customers, products, reviews] = await Promise.all([
      permissions["orders.view"] ? db("orders?select=id,order_number,customer_email,total,currency,status,payment_status,created_at,tracking_number&order=created_at.desc&limit=100") : Promise.resolve([]),
      permissions["customers.view"] ? db("profiles?select=user_id,full_name,email,phone,country,city,created_at&order=created_at.desc&limit=100") : Promise.resolve([]),
      (permissions["products.view"] || permissions["inventory.manage"] || permissions["products.manage"]) ? db("products?select=id,name,sku,status,stock_quantity,price,created_at&order=created_at.desc&limit=150") : Promise.resolve([]),
      permissions["reviews.manage"] ? db("reviews?select=id,reviewer_name,rating,title,body,status,created_at,products(name)&order=created_at.desc&limit=100") : Promise.resolve([]),
    ]);
    return NextResponse.json({
      staff: { user_id: user.id, email: staff.email, full_name: staff.full_name, role_key: staff.role_key, permissions },
      orders, customers, products, reviews,
    });
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request) {
  try {
    const { user, staff } = await requireStaff(request);
    const input = await request.json() as { action?: string; id?: string; status?: string; stock_quantity?: number };
    if (!input.id || !input.action) return NextResponse.json({ error: "Choose an item and action." }, { status: 400 });
    const permissions = staff.permissions || {};
    let table = "";
    let patch: Record<string, unknown> = {};
    let before: unknown = null;
    if (input.action === "order.status") {
      if (permissions["orders.update"] !== true) return NextResponse.json({ error: "Your role does not allow order updates." }, { status: 403 });
      if (!["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"].includes(input.status || "")) return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
      table = "orders";
      const rows = await db(`orders?id=eq.${encodeURIComponent(input.id)}&select=id,order_number,status&limit=1`);
      before = rows?.[0]; if (!before) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      patch = { status: input.status };
    } else if (input.action === "product.stock") {
      if (permissions["inventory.manage"] !== true) return NextResponse.json({ error: "Your role does not allow inventory updates." }, { status: 403 });
      if (!Number.isInteger(input.stock_quantity) || (input.stock_quantity as number) < 0 || (input.stock_quantity as number) > 10000000) return NextResponse.json({ error: "Stock quantity must be a whole number between 0 and 10,000,000." }, { status: 400 });
      table = "products";
      const rows = await db(`products?id=eq.${encodeURIComponent(input.id)}&select=id,name,stock_quantity&limit=1`);
      before = rows?.[0]; if (!before) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      patch = { stock_quantity: input.stock_quantity };
    } else if (input.action === "review.status") {
      if (permissions["reviews.manage"] !== true) return NextResponse.json({ error: "Your role does not allow review moderation." }, { status: 403 });
      if (!["pending", "approved", "rejected"].includes(input.status || "")) return NextResponse.json({ error: "Choose a valid review status." }, { status: 400 });
      table = "reviews";
      const rows = await db(`reviews?id=eq.${encodeURIComponent(input.id)}&select=id,reviewer_name,status&limit=1`);
      before = rows?.[0]; if (!before) return NextResponse.json({ error: "Review not found." }, { status: 404 });
      patch = { status: input.status };
    } else {
      return NextResponse.json({ error: "This workspace action is not supported." }, { status: 400 });
    }
    await db(`${table}?id=eq.${encodeURIComponent(input.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: user.id, actor_email: user.email || staff.email, action: input.action, target_type: table, target_id: input.id, details: { before, changes: patch } }) });
    return NextResponse.json({ updated: true });
  } catch (error) { return fail(error); }
}
