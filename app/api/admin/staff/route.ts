import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const allowedPermissions = new Set([
  "orders.view", "orders.update", "orders.delete",
  "customers.view", "customers.manage", "customers.delete",
  "products.view", "products.manage", "inventory.manage",
  "reviews.manage", "settings.manage", "tasks.manage",
  "staff.manage", "audit.view", "reports.view",
]);

function config() {
  if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Staff management server configuration is missing.");
  return { supabaseUrl, anonKey, serviceKey };
}

function serviceHeaders() {
  const { serviceKey } = config();
  return {
    apikey: serviceKey,
    ...(serviceKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${serviceKey}` }),
    "Content-Type": "application/json",
  };
}

async function serviceDb(path: string, init: RequestInit = {}) {
  const { supabaseUrl } = config();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  if (!response.ok) throw new Error(data?.message || data?.msg || "Staff database request failed.");
  return data;
}

async function requireAdmin(request: Request) {
  const { supabaseUrl, anonKey } = config();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Please sign in to the admin dashboard.");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Your admin session expired. Please sign in again.");
  const user = await response.json() as { id: string; email?: string };
  const admins = await serviceDb(`admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`);
  if (!admins?.length) throw new Error("Administrator access required.");
  return user;
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process staff request.";
  const status = /Administrator access required/.test(message) ? 403 :
    /sign in|session expired/i.test(message) ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

function cleanPermissions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, enabled]) => allowedPermissions.has(key) && enabled === true));
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const rows = await serviceDb("staff_members?select=user_id,email,full_name,role_key,permissions,status,invited_by,invited_at,last_seen_at,created_at,updated_at&order=created_at.desc");
    return NextResponse.json({ staff: rows || [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const input = await request.json() as {
      email?: string;
      full_name?: string;
      role_key?: string;
      permissions?: Record<string, unknown>;
    };
    const email = input.email?.trim().toLowerCase();
    const fullName = input.full_name?.trim() || "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Enter a valid staff email address." }, { status: 400 });
    if (email === admin.email?.toLowerCase())
      return NextResponse.json({ error: "The main administrator cannot be invited as staff." }, { status: 400 });

    const existing = await serviceDb(`staff_members?email=eq.${encodeURIComponent(email)}&select=user_id,status&limit=1`);
    if (existing?.length) return NextResponse.json({ error: "This email is already registered as staff. Update the existing staff record instead." }, { status: 409 });

    const { supabaseUrl, serviceKey } = config();
    const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent("https://kaoma.in/staff/accept")}`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ email, data: { full_name: fullName, kaoma_staff_invite: true } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const invited = await inviteResponse.json().catch(() => ({}));
    if (!inviteResponse.ok) {
      const message = invited?.msg || invited?.message || invited?.error_description || "Supabase could not send the staff invitation email.";
      return NextResponse.json({ error: message }, { status: inviteResponse.status === 429 ? 429 : 502 });
    }
    if (!invited?.id) return NextResponse.json({ error: "Invitation response did not include a user ID. Check Supabase Auth before retrying." }, { status: 502 });

    const roleKey = ["order_manager", "product_manager", "customer_support", "inventory_delivery", "custom"].includes(input.role_key || "")
      ? input.role_key! : "custom";
    const permissions = cleanPermissions(input.permissions);
    try {
      await serviceDb("staff_members", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: invited.id,
          email,
          full_name: fullName || null,
          role_key: roleKey,
          permissions,
          status: "invited",
          invited_by: admin.id,
        }),
      });
    } catch (error) {
      // The auth invitation may already have been emailed. Surface this distinctly to prevent duplicate invites.
      return NextResponse.json({
        error: "The invitation email may have been sent, but the staff record could not be saved. Check Supabase Auth and staff_members before retrying.",
        detail: error instanceof Error ? error.message : "Database write failed.",
      }, { status: 502 });
    }

    await serviceDb("staff_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_user_id: admin.id,
        actor_email: admin.email || null,
        action: "staff.invited",
        target_type: "staff_member",
        target_id: invited.id,
        details: { email, role_key: roleKey, permissions },
      }),
    });
    return NextResponse.json({ invited: true, staff: { user_id: invited.id, email, full_name: fullName, role_key: roleKey, permissions, status: "invited" } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const input = await request.json() as {
      user_id?: string;
      status?: string;
      role_key?: string;
      permissions?: Record<string, unknown>;
      full_name?: string;
    };
    if (!input.user_id) return NextResponse.json({ error: "Staff user ID is required." }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) {
      if (!["active", "suspended", "revoked", "invited"].includes(input.status))
        return NextResponse.json({ error: "Invalid staff status." }, { status: 400 });
      patch.status = input.status;
    }
    if (input.role_key !== undefined) {
      if (!["order_manager", "product_manager", "customer_support", "inventory_delivery", "custom"].includes(input.role_key))
        return NextResponse.json({ error: "Invalid staff role." }, { status: 400 });
      patch.role_key = input.role_key;
    }
    if (input.permissions !== undefined) patch.permissions = cleanPermissions(input.permissions);
    if (input.full_name !== undefined) patch.full_name = input.full_name.trim().slice(0, 120) || null;
    if (Object.keys(patch).length === 1) return NextResponse.json({ error: "No staff changes were supplied." }, { status: 400 });

    const current = await serviceDb(`staff_members?user_id=eq.${encodeURIComponent(input.user_id)}&select=user_id,email,status,role_key&limit=1`);
    if (!current?.length) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    await serviceDb(`staff_members?user_id=eq.${encodeURIComponent(input.user_id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await serviceDb("staff_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_user_id: admin.id,
        actor_email: admin.email || null,
        action: "staff.updated",
        target_type: "staff_member",
        target_id: input.user_id,
        details: { before: current[0], changes: patch },
      }),
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
