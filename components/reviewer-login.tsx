"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { saveCustomerSession, signIn, supabaseReady } from "@/lib/supabase-rest";

export function ReviewerLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    try {
      const session = await signIn(email, String(form.get("password") || ""));
      saveCustomerSession(session, email);
      window.location.assign("/account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="reviewerGate">
      <section className="reviewerCard">
        <Image src="/kaoma-logo.webp" alt="KAOMA" width={240} height={47} priority />
        <div className="reviewerLock"><LockKeyhole /></div>
        <span className="reviewerEyebrow">SECURE CHECKOUT REVIEW</span>
        <h1>Authorised test access</h1>
        <p>Sign in with the reviewer account supplied by KAOMA to test the customer checkout flow.</p>
        <form onSubmit={submit}>
          <label>Email address
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>Password
            <div className="reviewerPassword">
              <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {error && <div className="reviewerError" role="alert">{error}</div>}
          {!supabaseReady && <div className="reviewerError">Customer authentication is not configured.</div>}
          <button className="reviewerSubmit" disabled={busy || !supabaseReady}>
            {busy ? "Opening test account…" : "Sign in to review checkout"}
          </button>
        </form>
        <small><ShieldCheck /> Restricted payment-review access</small>
      </section>
    </main>
  );
}
