const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type CustomerSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: { id: string; email?: string };
};

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
  return data as CustomerSession;
}

export async function refreshCustomerSession(refreshToken: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.msg || data.error_description || "Your session has expired. Please sign in again.");
  return data as CustomerSession;
}

export function saveCustomerSession(session: CustomerSession, fallbackEmail = "") {
  localStorage.setItem("kaoma_customer_token", session.access_token);
  if (session.refresh_token)
    localStorage.setItem("kaoma_customer_refresh_token", session.refresh_token);
  localStorage.setItem("kaoma_customer_id", session.user.id);
  localStorage.setItem("kaoma_customer_email", session.user.email || fallbackEmail);
}

export function clearCustomerSession() {
  localStorage.removeItem("kaoma_customer_token");
  localStorage.removeItem("kaoma_customer_refresh_token");
  localStorage.removeItem("kaoma_customer_id");
  localStorage.removeItem("kaoma_customer_email");
}

function tokenExpiresSoon(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || Number(payload.exp) * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function getValidCustomerSession() {
  const accessToken = localStorage.getItem("kaoma_customer_token") || "";
  const refreshToken = localStorage.getItem("kaoma_customer_refresh_token") || "";
  if (accessToken && !tokenExpiresSoon(accessToken)) return accessToken;
  if (!refreshToken) {
    clearCustomerSession();
    throw new Error("Your session has expired. Please sign in again.");
  }
  try {
    const session = await refreshCustomerSession(refreshToken);
    saveCustomerSession(session, localStorage.getItem("kaoma_customer_email") || "");
    return session.access_token;
  } catch (error) {
    clearCustomerSession();
    throw error;
  }
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
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Choose a JPG, PNG or WebP image.");
  let uploadFile = file;
  try {
    const bitmap = await createImageBitmap(file), maxSide = 1800,
      scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .82));
      if (blob) uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
    }
    bitmap.close();
  } catch { uploadFile = file; }
  const safe = uploadFile.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${crypto.randomUUID()}-${safe}`;
  const response = await fetch(
    `${url}/storage/v1/object/product-images/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": uploadFile.type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false",
      },
      body: uploadFile,
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
  if (!response.ok) {
    const errorText = (await response.text()) || "Database request failed.";
    if (response.status === 401 || errorText.includes("PGRST303") || errorText.includes("JWT expired"))
      throw new Error("Your session has expired. Please sign in again.");
    throw new Error(errorText);
  }
  if (response.status === 204) return [];
  return response.json();
}
