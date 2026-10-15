import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  try {
    if (!url || !anon || !service) throw new Error("Staff management server configuration is missing.");
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!token) return NextResponse.json({ error: "Please sign in to the admin dashboard." }, { status: 401 });
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!auth.ok) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
    const user = await auth.json() as { id: string; email?: string };
    const elevated = { apikey: service, ...(service.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${service}` }), "Content-Type": "application/json" };
    const adminsResponse = await fetch(`${url}/rest/v1/admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`, { headers: elevated, cache: "no-store" });
    if (!adminsResponse.ok || !(await adminsResponse.json()).length) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const response = await fetch(`${url}/rest/v1/staff_audit_log?select=id,actor_user_id,actor_email,action,target_type,target_id,details,created_at&order=created_at.desc&limit=250`, { headers: elevated, cache: "no-store" });
    const body = await response.text();
    const data = body ? JSON.parse(body) : [];
    if (!response.ok) throw new Error(data?.message || "Could not load the activity log.");
    return NextResponse.json({ events: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the activity log." }, { status: 500 });
  }
}
