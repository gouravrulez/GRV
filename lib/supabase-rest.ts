const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && key);

export async function signIn(email: string, password: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error_description || data.msg || "Sign in failed.");
  return data as { access_token: string; user: { id: string; email?: string } };
}

export async function signUp(email: string, password: string, name: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const redirectTo = encodeURIComponent("https://kaoma.in/account");
  const response = await fetch(
    `${url}/auth/v1/signup?redirect_to=${redirectTo}`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: { full_name: name } }),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.msg || data.error_description || "Account creation failed.",
    );
  return data;
}
export async function resetPassword(email: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const redirectTo = encodeURIComponent("https://kaoma.in/account");
  const response = await fetch(
    `${url}/auth/v1/recover?redirect_to=${redirectTo}`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        gotrue_meta_security: { captcha_token: null },
      }),
    },
  );
  if (!response.ok)
    throw new Error((await response.json()).msg || "Reset request failed.");
}

export async function sendEmailOtp(email: string, name = "") {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const redirectTo = encodeURIComponent("https://kaoma.in/account");
  const response = await fetch(`${url}/auth/v1/otp?redirect_to=${redirectTo}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      create_user: true,
      data: { full_name: name },
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.msg ||
        data.error_description ||
        "Unable to send the secure email code.",
    );
  }
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  if (!/^\d{8}$/.test(token))
    throw new Error("Enter the complete 8-digit OTP from your email.");
  const response = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, type: "email" }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.msg || data.error_description || "The code is invalid or expired.",
    );
  return data as { access_token: string; user: { id: string; email?: string } };
}

export async function getCurrentUser(token: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || "Unable to read account.");
  return data as { id: string; email?: string };
}

export async function uploadProductImage(file: File, token: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${crypto.randomUUID()}-${safe}`;
  const response = await fetch(
    `${url}/storage/v1/object/product-images/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false",
      },
      body: file,
    },
  );
  if (!response.ok)
    throw new Error((await response.text()) || "Image upload failed.");
  return `${url}/storage/v1/object/public/product-images/${path}`;
}

export async function uploadCustomerAvatar(
  file: File,
  token: string,
  userId: string,
) {
  if (!url || !key) throw new Error("Customer accounts are unavailable.");
  if (!file.type.match(/^image\/(jpeg|png|webp)$/))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Profile photo must be smaller than 5 MB.");
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/profile.${extension}`;
  const response = await fetch(
    `${url}/storage/v1/object/customer-avatars/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: file,
    },
  );
  if (!response.ok)
    throw new Error((await response.text()) || "Profile photo upload failed.");
  return path;
}

export async function getCustomerAvatarUrl(path: string, token: string) {
  if (!url || !key || !path) return "";
  const response = await fetch(
    `${url}/storage/v1/object/sign/customer-avatars/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    },
  );
  if (!response.ok) return "";
  const data = await response.json();
  const signed = data.signedURL || data.signedUrl || "";
  return signed ? `${url}/storage/v1${signed}` : "";
}

export async function db(path: string, token = "", init: RequestInit = {}) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      // New sb_publishable_* keys are API keys, not customer JWTs. Sending one
      // as a Bearer token makes anonymous catalogue requests fail. Only attach
      // Authorization when a real signed-in customer/admin token is present.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!response.ok)
    throw new Error((await response.text()) || "Database request failed.");
  if (response.status === 204) return [];
  return response.json();
}
