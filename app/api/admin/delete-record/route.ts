import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const mainEmail = "kaomaglobal@gmail.com";

function headers() {
  if (!url || !anon || !secret) throw new Error("Admin deletion server configuration is missing.");
  return { apikey: secret, ...(secret.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${secret}` }), "Content-Type": "application/json" };
}
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.message || data?.msg || "Database request failed.");
  return data;
}
async function authorize(request: Request) {
  if (!url || !anon) throw new Error("Admin authentication is not configured.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw Object.assign(new Error("Please sign in to the main admin account."), { status: 401 });
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Object.assign(new Error("Your admin session expired. Please sign in again."), { status: 401 });
  const user = await response.json() as { id: string; email?: string };
  if (user.email?.toLowerCase() !== mainEmail) throw Object.assign(new Error("Only the main administrator can permanently delete customer or order records."), { status: 403 });
  const admins = await db(`admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`);
  if (!admins?.length) throw Object.assign(new Error("Main administrator access is not configured."), { status: 403 });
  return user;
}
async function audit(user: { id: string; email?: string }, action: string, type: string, id: string, details: Record<string, unknown>) {
  try { await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: user.id, actor_email: user.email || mainEmail, action, target_type: type, target_id: id, details }) }); } catch {}
}
export async function DELETE(request: Request) {
  try {
    const admin = await authorize(request);
    const input = await request.json().catch(() => ({})) as { kind?: string; id?: string };
    if (!input.id || !/^[0-9a-f-]{16,64}$/i.test(input.id)) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
    if (input.kind === "order") {
      const found = await db(`orders?id=eq.${encodeURIComponent(input.id)}&select=id,order_number,customer_email&limit=1`);
      if (!found?.length) return NextResponse.json({ error: "Order not found; it may already have been deleted." }, { status: 404 });
      await db(`order_items?order_id=eq.${encodeURIComponent(input.id)}`, { method: "DELETE" });
      await db(`orders?id=eq.${encodeURIComponent(input.id)}`, { method: "DELETE" });
      await audit(admin, "admin.order.deleted", "order", input.id, { order_number: found[0].order_number, customer_email: found[0].customer_email });
      return NextResponse.json({ deleted: true, kind: "order" });
    }
    if (input.kind === "customer") {
      const found = await db(`profiles?user_id=eq.${encodeURIComponent(input.id)}&select=user_id,email,full_name&limit=1`);
      if (!found?.length) return NextResponse.json({ error: "Customer not found; it may already have been deleted." }, { status: 404 });
      const customer = found[0] as { user_id: string; email?: string | null; full_name?: string | null };
      const authResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(input.id)}`, {
        method: "DELETE",
        headers: headers(),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!authResponse.ok) {
        const error = await authResponse.json().catch(() => ({}));
        throw new Error(error.msg || error.message || "Could not delete the customer's sign-in account.");
      }
      // Remove any profile row left behind if the project's FK is not configured to cascade.
      await db(`profiles?user_id=eq.${encodeURIComponent(input.id)}`, { method: "DELETE" });
      await audit(admin, "admin.customer.deleted", "customer", input.id, {
        email: customer.email || null,
        full_name: customer.full_name || null,
        note: "Customer sign-in account and profile deleted; existing order history is retained.",
      });
      return NextResponse.json({ deleted: true, kind: "customer", retainedOrderHistory: true });
    }
    return NextResponse.json({ error: "Choose a customer or order record." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete record.";
    const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status: number }).status) : /sign in|session expired/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
