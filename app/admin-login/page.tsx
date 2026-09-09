"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { signIn, supabaseReady } from "@/lib/supabase-rest";

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const session = await signIn(String(form.get("email")), String(form.get("password")));
      sessionStorage.setItem("kaoma_admin_token", session.access_token);
      window.location.assign("/admin");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed."); setBusy(false); }
  }
  return <main className="adminGate">
    <form className="adminLoginCard" onSubmit={submit}>
      <Image src="/kaoma-logo.webp" alt="KAOMA" width={240} height={47} priority />
      <div className="adminLock"><LockKeyhole /></div>
      <h1>Administration</h1>
      <p>Private access for authorised KAOMA administrators.</p>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <div className="adminError">{error}</div>}
      {!supabaseReady && <div className="adminNotice">Add the Supabase environment values in Vercel before using this login.</div>}
      <button className="primary" disabled={busy || !supabaseReady}>{busy ? "Signing in…" : "Sign in securely"}</button>
      <a href="/">Return to customer website</a>
    </form>
  </main>;
}
