import { createHmac, timingSafeEqual } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

export function requireServerConfiguration() {
  if (!supabaseUrl || !anonKey || !serviceKey || !razorpayKeyId || !razorpayKeySecret)
    throw new Error("Payment service is not configured.");
  return { supabaseUrl, anonKey, serviceKey, razorpayKeyId, razorpayKeySecret };
}

export async function authenticatedCustomer(request: Request) {
  const { supabaseUrl, anonKey } = requireServerConfiguration();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Please sign in before paying.");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Your session expired. Please sign in again.");
  const user = (await response.json()) as { id: string; email?: string };
  return { token, user };
}

export async function serviceDb(path: string, init: RequestInit = {}) {
  const { supabaseUrl, serviceKey } = requireServerConfiguration();
  const elevatedHeaders: Record<string, string> = { apikey: serviceKey };
  if (!serviceKey.startsWith("sb_secret_")) elevatedHeaders.Authorization = `Bearer ${serviceKey}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...elevatedHeaders,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(12000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || "Database request failed.");
  return data;
}

export async function razorpay(path: string, init: RequestInit = {}) {
  const { razorpayKeyId, razorpayKeySecret } = requireServerConfiguration();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || "Razorpay request failed.");
  return data;
}

export function validSignature(orderId: string, paymentId: string, signature: string) {
  const { razorpayKeySecret } = requireServerConfiguration();
  const expected = createHmac("sha256", razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(signature) || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
