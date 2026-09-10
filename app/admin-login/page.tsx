"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { signIn, supabaseReady } from "@/lib/supabase-rest";

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  return <main className="adminGate luxuryAdminGate">
    <section className="adminLoginStory" aria-hidden="true">
      <div className="adminStoryMark"><Sparkles/><span>KAOMA PRIVATE OFFICE</span></div>
      <div><p>DESIRE · BEAUTY · CONNECTION</p><h1>The art of luxury,<br/><i>thoughtfully managed.</i></h1><span>A private workspace created for a discreet global brand.</span></div>
      <small><ShieldCheck/>Protected administrative access</small>
    </section>
    <form className="adminLoginCard luxuryLoginCard" onSubmit={submit}>
      <div className="adminLoginLogo"><Image src="/kaoma-logo.webp" alt="KAOMA" width={240} height={47} priority /><span>ADMINISTRATION</span></div>
      <div className="adminLock"><LockKeyhole /></div>
      <div className="adminLoginHeading"><p>WELCOME BACK</p><h2>Sign in to your private office</h2><span>Use your authorised administrator account.</span></div>
      <label>Email address<input name="email" type="email" autoComplete="username" placeholder="admin@kaoma.in" required /></label>
      <label>Password<div className="passwordField"><input name="password" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Enter your password" required /><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
      {error && <div className="adminError">{error}</div>}
      {!supabaseReady && <div className="adminNotice">Add the Supabase environment values in Vercel before using this login.</div>}
      <button className="primary adminSignIn" disabled={busy || !supabaseReady}>{busy ? "Opening private office…" : "Sign in securely"}</button>
      <div className="adminSecurity"><ShieldCheck/><span>Encrypted and restricted to authorised administrators</span></div>
      <a href="/"><ArrowLeft/> Return to customer website</a>
    </form>
  </main>;
}
