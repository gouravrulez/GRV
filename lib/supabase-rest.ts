const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type CustomerSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: { id: string; email?: string };
};

export const supabaseReady = Boolean(url && key);

let customerRefreshPromise: Promise<CustomerSession> | null = null;
const CUSTOMER_SESSION_EXPIRED_EVENT = "kaoma:customer-session-expired";

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
  return data as CustomerSession;
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

export function saveAdminSession(session: CustomerSession) {
  sessionStorage.setItem("kaoma_admin_token", session.access_token);
  if (session.refresh_token) sessionStorage.setItem("kaoma_admin_refresh_token", session.refresh_token);
}

export function clearAdminSession() {
  sessionStorage.removeItem("kaoma_admin_token");
  sessionStorage.removeItem("kaoma_admin_refresh_token");
}

function tokenExpiryTime(token: string) {
  try {
    const segment = token.split(".")[1] || "";
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return Number(payload.exp) * 1000 || 0;
  } catch {
    return 0;
  }
}

function tokenExpiresSoon(token: string) {
  const expiry = tokenExpiryTime(token);
  return !expiry || expiry <= Date.now() + 120_000;
}

export function customerSessionRefreshDelay(token: string) {
  const expiry = tokenExpiryTime(token);
  if (!expiry) return 5_000;
  return Math.max(5_000, Math.min(expiry - Date.now() - 120_000, 50 * 60_000));
}

export function isCustomerSessionExpiredError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /session.*expired|jwt.*expired|invalid refresh token|refresh token.*(invalid|expired)|session_not_found/i.test(message);
}

function announceExpiredCustomerSession() {
  clearCustomerSession();
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CUSTOMER_SESSION_EXPIRED_EVENT));
}

export async function getValidCustomerSession() {
  const accessToken = localStorage.getItem("kaoma_customer_token") || "";
  const refreshToken = localStorage.getItem("kaoma_customer_refresh_token") || "";
  if (accessToken && !tokenExpiresSoon(accessToken)) return accessToken;
  if (!refreshToken) {
    announceExpiredCustomerSession();
    throw new Error("Your session has expired. Please sign in again.");
  }
  try {
    if (!customerRefreshPromise)
      customerRefreshPromise = refreshCustomerSession(refreshToken).finally(() => {
        customerRefreshPromise = null;
      });
    const session = await customerRefreshPromise;
    saveCustomerSession(session, localStorage.getItem("kaoma_customer_email") || "");
    return session.access_token;
  } catch (error) {
    announceExpiredCustomerSession();
    throw error;
  }
}

export async function getValidAdminSession() {
  const accessToken = sessionStorage.getItem("kaoma_admin_token") || "";
  const refreshToken = sessionStorage.getItem("kaoma_admin_refresh_token") || "";
  if (accessToken && !tokenExpiresSoon(accessToken)) return accessToken;
  if (!refreshToken) { clearAdminSession(); throw new Error("Your admin session expired. Please sign in again."); }
  const session = await refreshCustomerSession(refreshToken);
  saveAdminSession(session);
  return session.access_token;
}

export async function getCurrentUser(token: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || data.code === "session_expired" || data.code === "session_not_found")
      throw new Error("Your session has expired. Please sign in again.");
    throw new Error(data.msg || "Unable to read account.");
  }
  return data as { id: string; email?: string };
}

export async function uploadProductImage(file: File, token: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const reportedType = file.type.toLowerCase();
  const normalizedType = reportedType === "image/jpg" ? "image/jpeg" : reportedType;
  const supportedType = /^image\/(jpeg|png|webp)$/.test(normalizedType);
  const looksLikeImage = reportedType.startsWith("image/") || /^(jpg|jpeg|png|webp|avif|heic|heif)$/.test(extension);
  if (!looksLikeImage) throw new Error(`${file.name}: choose a photo from your gallery.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: image must be smaller than 25 MB.`);
  let uploadFile = normalizedType && normalizedType !== file.type ? new File([file], file.name, { type: normalizedType }) : file;
  if (!supportedType || file.size > 4.5 * 1024 * 1024) {
    try {
      const compression = (async () => {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing unavailable.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .8));
        if (!blob) throw new Error("Image conversion failed.");
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
      })();
      uploadFile = await Promise.race([compression, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000))]);
    } catch {
      throw new Error(`${file.name}: Android image format could not be converted. In Gallery choose Edit → Save copy, or export it as JPG, then upload the JPG.`);
    }
  }
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
  if (!response.ok) {
    const details = await response.text();
    if (response.status === 401 || details.includes("JWT expired")) throw new Error("Admin session expired. Sign in again and retry.");
    throw new Error(`${file.name}: ${details || "image upload failed."}`);
  }
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
    if (response.status === 401 || errorText.includes("PGRST303") || errorText.includes("JWT expired")) {
      if (
        typeof window !== "undefined" &&
        token &&
        token === localStorage.getItem("kaoma_customer_token")
      )
        announceExpiredCustomerSession();
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw new Error(errorText);
  }
  if (response.status === 204) return [];
  return response.json();
}
