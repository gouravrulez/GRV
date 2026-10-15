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
  if (!response.ok) throw new Error(data?.message || "Staff task request failed.");
  return data;
}
async function requireStaff(request: Request) {
  if (!url || !anon) throw new Error("Supabase authentication is not configured.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Sign in using your KAOMA staff invitation.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Your staff session expired. Please accept your invitation or sign in again.");
  const user = await response.json() as { id: string; email?: string };
  const rows = await db(`staff_members?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,email,full_name,status,permissions&limit=1`);
  if (!rows?.length || rows[0].status !== "active") throw new Error("Your KAOMA staff account is not active. Contact the main administrator.");
  return { user, staff: rows[0] };
}
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to access staff tasks.";
  const status = /sign in|session expired/i.test(message) ? 401 : /not active/i.test(message) ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}
export async function GET(request: Request) {
  try {
    const { user } = await requireStaff(request);
    const tasks = await db(`staff_tasks?assigned_to=eq.${encodeURIComponent(user.id)}&select=id,title,description,work_area,priority,status,due_at,created_at,updated_at&order=due_at.asc.nullslast`);
    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const { user } = await requireStaff(request);
    const input = await request.json() as { id?: string; status?: string };
    if (!input.id || !["todo", "in_progress", "blocked", "completed"].includes(input.status || ""))
      return NextResponse.json({ error: "Choose a valid task and progress status." }, { status: 400 });
    const current = await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}&assigned_to=eq.${encodeURIComponent(user.id)}&select=id,title,status&limit=1`);
    if (!current?.length) return NextResponse.json({ error: "This task is not assigned to your account." }, { status: 404 });
    await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}&assigned_to=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: input.status, completed_at: input.status === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }),
    });
    await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: user.id, actor_email: user.email || null, action: "task.progress_updated", target_type: "staff_task", target_id: input.id, details: { before: current[0], status: input.status } }) });
    return NextResponse.json({ updated: true });
  } catch (error) { return errorResponse(error); }
}
