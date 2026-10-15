import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  if (!url || !anon || !service) throw new Error("Staff management server configuration is missing.");
  return { apikey: service, ...(service.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${service}` }), "Content-Type": "application/json" };
}
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.message || "Staff task database request failed.");
  return data;
}
async function admin(request: Request) {
  if (!url || !anon) throw new Error("Supabase configuration is missing.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Please sign in to the admin dashboard.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Your session expired. Please sign in again.");
  const user = await response.json() as { id: string; email?: string };
  const admins = await db(`admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`);
  if (!admins?.length) throw new Error("Administrator access required.");
  return user;
}
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process staff task.";
  const status = /Administrator access required/.test(message) ? 403 : /sign in|session expired/i.test(message) ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}
export async function GET(request: Request) {
  try {
    await admin(request);
    const tasks = await db("staff_tasks?select=*,staff_members(email,full_name,role_key,status)&order=created_at.desc");
    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await admin(request);
    const input = await request.json() as { title?: string; description?: string; work_area?: string; priority?: string; assigned_to?: string | null; due_at?: string | null };
    const title = input.title?.trim();
    if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });
    if (title.length > 180) return NextResponse.json({ error: "Task title must be 180 characters or fewer." }, { status: 400 });
    const priority = ["low", "normal", "high", "urgent"].includes(input.priority || "") ? input.priority : "normal";
    const workArea = ["orders", "customers", "products", "inventory", "reviews", "marketing", "general"].includes(input.work_area || "") ? input.work_area : "general";
    if (input.assigned_to) {
      const staff = await db(`staff_members?user_id=eq.${encodeURIComponent(input.assigned_to)}&select=user_id,status&limit=1`);
      if (!staff?.length || !["invited", "active"].includes(staff[0].status)) return NextResponse.json({ error: "Choose an invited or active staff member." }, { status: 400 });
    }
    const created = await db("staff_tasks?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title, description: input.description?.trim().slice(0, 4000) || null, work_area: workArea, priority, assigned_to: input.assigned_to || null, due_at: input.due_at || null, created_by: actor.id }) });
    await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: actor.id, actor_email: actor.email || null, action: "task.created", target_type: "staff_task", target_id: created?.[0]?.id || null, details: { title, assigned_to: input.assigned_to || null, work_area: workArea, priority } }) });
    return NextResponse.json({ task: created?.[0] }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await admin(request);
    const input = await request.json() as { id?: string; title?: string; description?: string; work_area?: string; priority?: string; status?: string; assigned_to?: string | null; due_at?: string | null };
    if (!input.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title || title.length > 180) return NextResponse.json({ error: "Enter a task title up to 180 characters." }, { status: 400 });
      patch.title = title;
    }
    if (input.description !== undefined) patch.description = input.description.trim().slice(0, 4000) || null;
    if (input.work_area !== undefined) {
      if (!["orders", "customers", "products", "inventory", "reviews", "marketing", "general"].includes(input.work_area)) return NextResponse.json({ error: "Invalid work area." }, { status: 400 });
      patch.work_area = input.work_area;
    }
    if (input.priority !== undefined) {
      if (!["low", "normal", "high", "urgent"].includes(input.priority)) return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
      patch.priority = input.priority;
    }
    if (input.status !== undefined) {
      if (!["todo", "in_progress", "blocked", "completed", "cancelled"].includes(input.status)) return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
      patch.status = input.status;
      patch.completed_at = input.status === "completed" ? new Date().toISOString() : null;
    }
    if (input.assigned_to !== undefined) patch.assigned_to = input.assigned_to || null;
    if (input.due_at !== undefined) patch.due_at = input.due_at || null;
    const current = await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}&select=id,title,status,assigned_to&limit=1`);
    if (!current?.length) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: actor.id, actor_email: actor.email || null, action: "task.updated", target_type: "staff_task", target_id: input.id, details: { before: current[0], changes: patch } }) });
    return NextResponse.json({ updated: true });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try {
    const actor = await admin(request);
    const input = await request.json() as { id?: string };
    if (!input.id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    const current = await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}&select=id,title,status&limit=1`);
    if (!current?.length) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    await db(`staff_tasks?id=eq.${encodeURIComponent(input.id)}`, { method: "DELETE" });
    await db("staff_audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: actor.id, actor_email: actor.email || null, action: "task.deleted", target_type: "staff_task", target_id: input.id, details: current[0] }) });
    return NextResponse.json({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
