"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ClipboardCheck, Clock3, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
type Task = { id: string; title: string; description: string | null; work_area: string; priority: string; status: string; due_at: string | null; created_at: string };

export default function StaffWorkspace() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTasks(authToken: string) {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/staff/tasks", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load assigned tasks.");
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tasks.");
      if (/not active|session expired|sign in/i.test(e instanceof Error ? e.message : "")) {
        sessionStorage.removeItem("kaoma_staff_token"); setToken("");
      }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("kaoma_staff_token") || "";
    const savedEmail = sessionStorage.getItem("kaoma_staff_email") || "";
    if (saved) { setToken(saved); setEmail(savedEmail); void loadTasks(saved); }
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (!supabaseUrl || !anonKey) throw new Error("Staff sign-in is not configured.");
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password }), cache: "no-store",
      });
      const session = await response.json();
      if (!response.ok || !session.access_token) throw new Error(session.error_description || session.msg || "Sign in failed.");
      const taskResponse = await fetch("/api/staff/tasks", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const taskData = await taskResponse.json();
      if (!taskResponse.ok) throw new Error(taskData.error || "This account does not have active staff access.");
      sessionStorage.setItem("kaoma_staff_token", session.access_token);
      if (session.refresh_token) sessionStorage.setItem("kaoma_staff_refresh_token", session.refresh_token);
      sessionStorage.setItem("kaoma_staff_email", session.user?.email || loginEmail);
      setToken(session.access_token); setEmail(session.user?.email || loginEmail); setTasks(taskData.tasks || []);
      setPassword(""); setMessage("Signed in securely.");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed."); }
    finally { setBusy(false); }
  }

  async function updateStatus(task: Task, status: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/staff/tasks", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, status }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update task.");
      setMessage("Task progress updated."); await loadTasks(token);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update task."); }
    finally { setBusy(false); }
  }

  function logout() {
    sessionStorage.removeItem("kaoma_staff_token"); sessionStorage.removeItem("kaoma_staff_refresh_token"); sessionStorage.removeItem("kaoma_staff_email");
    setToken(""); setEmail(""); setTasks([]); setMessage("You have signed out.");
  }

  if (!token) return <main className="staffAcceptShell"><section className="staffAcceptStory"><div><ClipboardCheck/><span>KAOMA PRIVATE OFFICE</span></div><h1>Every detail,<br/><i>moving forward.</i></h1><p>Your assigned work, deadlines and progress updates in one secure workspace.</p><small><ShieldCheck/> Protected staff access</small></section><section className="staffAcceptCard"><Image src="/kaoma-logo.webp" alt="KAOMA" width={220} height={48} priority/><p className="staffEyebrow">TEAM WORKSPACE</p><h2>Staff sign in</h2><p className="staffAcceptHint">Use the email and password you set when accepting your invitation.</p><form className="staffAcceptForm" onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="name@example.com"/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password"/></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in to workspace"}</button></form>{error && <div className="adminError" role="alert">{error}</div>}<a className="staffAcceptLink" href="/staff/accept">Accept a new invitation</a><p className="staffAcceptFoot"><ShieldCheck/> Your access is controlled by the KAOMA administrator.</p></section></main>;

  const openTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length;
  return <main className="staffWorkspaceShell"><header className="staffWorkspaceHeader"><Image src="/kaoma-logo.webp" alt="KAOMA" width={165} height={36}/><div><span>{email}</span><button type="button" onClick={logout}><LogOut size={16}/> Sign out</button></div></header><section className="staffWorkspaceIntro"><p className="staffEyebrow">YOUR KAOMA WORKSPACE</p><h1>Welcome to your task desk.</h1><p>Review your assignments, update progress and flag blockers for the administrator.</p></section>{message && <div className="adminSuccess">{message}</div>}{error && <div className="adminError">{error}</div>}<section className="staffWorkspaceStats"><article><ClipboardCheck/><b>{tasks.length}</b><span>Assigned tasks</span></article><article><Clock3/><b>{openTasks}</b><span>In progress / open</span></article><article><CheckCircle2/><b>{tasks.filter((t) => t.status === "completed").length}</b><span>Completed</span></article></section><section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Your assignments</h2><button type="button" className="secondary" onClick={() => void loadTasks(token)} disabled={loading}><RefreshCw size={16}/> Refresh</button></div>{loading ? <p>Loading your tasks…</p> : !tasks.length ? <div className="staffWorkspaceEmpty"><ClipboardCheck/><h3>No tasks assigned yet</h3><p>New assignments from your administrator will appear here.</p></div> : tasks.map((task) => <article className="staffTaskCard" key={task.id}><div className="staffTaskHead"><div><span className={`staffPriority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><p>{task.description || "No additional instructions."}</p></div><span className={`staffStatus ${task.status}`}>{task.status.replace("_", " ")}</span></div><div className="staffTaskMeta"><span>{task.work_area}</span><span>{task.due_at ? `Due ${new Date(task.due_at).toLocaleDateString()}` : "No due date"}</span></div><label className="staffProgressControl">Update progress<select disabled={busy} value={task.status} onChange={(e) => void updateStatus(task, e.target.value)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked — need help</option><option value="completed">Completed</option></select></label></article>)}</section><footer className="staffWorkspaceFooter"><ShieldCheck size={16}/> Staff access is restricted. Contact the administrator if your permissions or assignments need to change.</footer></main>;
}
