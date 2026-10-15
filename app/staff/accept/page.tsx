"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function StaffAcceptPage() {
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Verifying your secure invitation…");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tokenHash = query.get("token_hash") || query.get("token");
    const accessToken = hash.get("access_token") || query.get("access_token");
    if (!tokenHash && !accessToken) {
      processed.current = true;
      setMessage("");
      setError(query.has("code") ? "This invitation uses a code-based sign-in flow that could not be verified in this browser. Ask the KAOMA administrator to resend the invitation after checking the Supabase Auth URL configuration." : "No invitation token was found. Open the latest KAOMA staff invitation email on this page.");
      return;
    }
    processed.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/staff/accept", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenHash ? { token_hash: tokenHash } : { access_token: accessToken }),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to verify the invitation.");
        if (!data.access_token) throw new Error("The invitation was verified but did not return a secure session. Ask the administrator to resend it.");
        setToken(data.access_token);
        setRefreshToken(data.refresh_token || "");
        setEmail(data.user?.email || "");
        setMessage("Invitation verified. Create a password to finish setting up your staff account.");
        window.history.replaceState({}, document.title, "/staff/accept");
      } catch (e) {
        setMessage("");
        setError(e instanceof Error ? e.message : "Unable to verify the invitation.");
      }
    })();
  }, []);

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (password.length < 10) { setError("Use at least 10 characters for your password."); setBusy(false); return; }
    if (password !== confirm) { setError("The passwords do not match."); setBusy(false); return; }
    try {
      if (!supabaseUrl || !anonKey || !token) throw new Error("The invitation session is missing. Reopen your invitation email.");
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "PUT", headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password }), cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || "Could not set your password.");
      sessionStorage.setItem("kaoma_staff_token", token);
      if (refreshToken) sessionStorage.setItem("kaoma_staff_refresh_token", refreshToken);
      if (email) sessionStorage.setItem("kaoma_staff_email", email);
      window.location.assign("/staff");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to finish staff setup."); setBusy(false); }
  }

  return <main className="staffAcceptShell">
    <section className="staffAcceptStory"><div><Sparkles/><span>KAOMA PRIVATE OFFICE</span></div><h1>Your work,<br/><i>beautifully organised.</i></h1><p>A secure workspace for your assigned responsibilities, task progress and team updates.</p><small><ShieldCheck/> Access is limited by your staff role.</small></section>
    <section className="staffAcceptCard"><Image src="/kaoma-logo.webp" alt="KAOMA" width={220} height={48} priority/><p className="staffEyebrow">STAFF ACCOUNT SETUP</p><h2>Accept your invitation</h2><p className="staffAcceptHint">{message || "Verify your invitation to continue."}</p>
      {email && <div className="staffAcceptEmail">{email}</div>}
      {token && <form onSubmit={finish} className="staffAcceptForm"><label>Create password<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 10 characters"/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Enter it again"/></label><button className="primary" disabled={busy}><KeyRound size={17}/>{busy ? "Securing your account…" : "Finish setup and open workspace"}</button></form>}
      {error && <div className="adminError" role="alert">{error}</div>}
      <p className="staffAcceptFoot"><ShieldCheck/> Never share your password or invitation link.</p>
    </section>
  </main>;
}
