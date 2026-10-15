import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
function serviceHeaders() {
  if (!url || !anon || !service) throw new Error("Staff invitation service is not configured.");
  return { apikey: service, ...(service.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${service}` }), "Content-Type": "application/json" };
}
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  const raw = await response.text(); const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.message || "Staff profile update failed.");
  return data;
}
export async function POST(request: Request) {
  try {
    if (!url || !anon) throw new Error("Supabase authentication is not configured.");
    const input = await request.json() as { token_hash?: string; access_token?: string };
    let session: { access_token?: string; refresh_token?: string; user?: { id: string; email?: string } } | null = null;
    if (input.token_hash) {
      const response = await fetch(`${url}/auth/v1/verify`, {
        method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash: input.token_hash, type: "invite" }), cache: "no-store", signal: AbortSignal.timeout(12000),
      });
      session = await response.json().catch(() => null);
      if (!response.ok || !session?.user?.id) return NextResponse.json({ error: "This invitation link is invalid or expired. Ask the administrator to send a new invitation." }, { status: 400 });
    } else if (input.access_token) {
      const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${input.access_token}` }, cache: "no-store" });
      if (!response.ok) return NextResponse.json({ error: "The invitation session is invalid or expired." }, { status: 401 });
      session = { access_token: input.access_token, user: await response.json() };
    } else {
      return NextResponse.json({ error: "Invitation token is missing." }, { status: 400 });
    }
    const user = session!.user!;
    const staff = await db(`staff_members?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,email,status&limit=1`);
    if (!staff?.length || ["suspended", "revoked"].includes(staff[0].status))
      return NextResponse.json({ error: "This account is not authorised for KAOMA staff access. Contact the main administrator." }, { status: 403 });
    await db(`staff_members?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "active", last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    });
    return NextResponse.json({ access_token: session!.access_token || null, refresh_token: session!.refresh_token || null, user: { id: user.id, email: user.email || staff[0].email }, activated: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept staff invitation." }, { status: 500 });
  }
}
