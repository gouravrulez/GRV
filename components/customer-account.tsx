"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  db,
  getCurrentUser,
  sendEmailOtp,
  supabaseReady,
  verifyEmailOtp,
} from "@/lib/supabase-rest";

type Profile = {
  full_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  address_line1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
};
export function CustomerAccount() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile>({});
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.replace(/^#/, "")),
      hashToken = hash.get("access_token") || "",
      hashUser = hash.get("user_id") || "";
    if (hashToken) {
      localStorage.setItem("kaoma_customer_token", hashToken);
      if (hashUser) localStorage.setItem("kaoma_customer_id", hashUser);
      else
        getCurrentUser(hashToken)
          .then((user) => {
            localStorage.setItem("kaoma_customer_id", user.id);
            localStorage.setItem("kaoma_customer_email", user.email || "");
            setUserId(user.id);
            db(`profiles?user_id=eq.${user.id}&select=*`, hashToken).then(
              (rows) => setProfile(rows[0] || {}),
            );
          })
          .catch(() => {});
      history.replaceState(null, "", "/account");
    }
    const t = hashToken || localStorage.getItem("kaoma_customer_token") || "",
      id = hashUser || localStorage.getItem("kaoma_customer_id") || "";
    setToken(t);
    setUserId(id);
    if (t && id)
      db(`profiles?user_id=eq.${id}&select=*`, t)
        .then((rows) => setProfile(rows[0] || {}))
        .catch(() => {});
  }, []);
  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await sendEmailOtp(email);
      setCodeSent(true);
      setMessage("Enter the OTP sent to your email.");
    } catch (x) {
      setMessage(x instanceof Error ? x.message : "Unable to send code.");
    } finally {
      setBusy(false);
    }
  }
  async function confirmCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const s = await verifyEmailOtp(email, String(f.get("code")).trim());
      localStorage.setItem("kaoma_customer_token", s.access_token);
      localStorage.setItem("kaoma_customer_email", s.user.email || email);
      localStorage.setItem("kaoma_customer_id", s.user.id);
      setToken(s.access_token);
      setUserId(s.user.id);
      setMessage("Signed in securely.");
      const rows = await db(
        `profiles?user_id=eq.${s.user.id}&select=*`,
        s.access_token,
      );
      setProfile(rows[0] || { email });
    } catch (x) {
      setMessage(x instanceof Error ? x.message : "Unable to verify code.");
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget),
      body = {
        user_id: userId,
        full_name: String(f.get("full_name")),
        email:
          localStorage.getItem("kaoma_customer_email") ||
          profile.email ||
          email,
        phone: String(f.get("phone")),
        country: String(f.get("country")),
        address_line1: String(f.get("address_line1")),
        city: String(f.get("city")),
        region: String(f.get("region")),
        postal_code: String(f.get("postal_code")),
      };
    try {
      await db("profiles?on_conflict=user_id", token, {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(body),
      });
      setProfile(body);
      setMessage("Your delivery details have been saved.");
    } catch (x) {
      setMessage(x instanceof Error ? x.message : "Unable to save details.");
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    localStorage.removeItem("kaoma_customer_token");
    localStorage.removeItem("kaoma_customer_email");
    localStorage.removeItem("kaoma_customer_id");
    location.reload();
  }
  if (token)
    return (
      <div className="accountBox">
        <h2>Your private account</h2>
        <p>Save your international delivery address for a faster checkout.</p>
        <form onSubmit={saveProfile}>
          <label>
            Full name
            <input
              name="full_name"
              defaultValue={profile.full_name || ""}
              required
            />
          </label>
          <label>
            Phone with country code
            <input
              name="phone"
              defaultValue={profile.phone || ""}
              placeholder="+91 98765 43210"
              required
            />
          </label>
          <label>
            Country / region
            <input
              name="country"
              defaultValue={profile.country || ""}
              placeholder="India"
              required
            />
          </label>
          <label>
            Street address
            <input
              name="address_line1"
              defaultValue={profile.address_line1 || ""}
              required
            />
          </label>
          <div className="two">
            <label>
              City
              <input name="city" defaultValue={profile.city || ""} required />
            </label>
            <label>
              State / province
              <input
                name="region"
                defaultValue={profile.region || ""}
                required
              />
            </label>
          </div>
          <label>
            Postal / ZIP code
            <input
              name="postal_code"
              defaultValue={profile.postal_code || ""}
              required
            />
          </label>
          {message && <div className="accountMessage">{message}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save my details"}
          </button>
          <button className="textButton" type="button" onClick={logout}>
            Sign out
          </button>
        </form>
      </div>
    );
  return (
    <div className="accountBox">
      <h2>Sign in to KAOMA</h2>
      <p>Enter your email. We will send you a one-time login code.</p>
      {!codeSent ? (
        <form onSubmit={requestCode}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          {message && <div className="accountMessage">{message}</div>}
          {!supabaseReady && (
            <div className="adminNotice">
              Customer sign-in is temporarily unavailable. Please try again
              shortly.
            </div>
          )}
          <button className="primary" disabled={busy || !supabaseReady}>
            {busy ? "Sending OTP…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmCode}>
          <label>
            Code sent to {email}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={6}
              placeholder="6-digit code"
              required
            />
          </label>
          {message && <div className="accountMessage">{message}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Checking…" : "Verify and sign in"}
          </button>
          <button
            className="textButton"
            type="button"
            onClick={() => setCodeSent(false)}
          >
            Use another email
          </button>
        </form>
      )}
      <p>
          New customers are registered automatically after verifying the OTP. No password is required.
      </p>
    </div>
  );
}
