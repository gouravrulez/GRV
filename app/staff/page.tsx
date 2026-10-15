"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ClipboardCheck, Clock3, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
type Task = { id: string; title: string; description: string | null; work_area: string; priority: string; status: string; due_at: string | null; created_at: string };
type OrderRow = { id: string; order_number: string; customer_email: string; total: number; currency: string; status: string; payment_status: string; created_at: string };
type CustomerRow = { user_id: string; full_name: string | null; email: string | null; phone: string | null; country: string | null; city: string | null; created_at: string };
type ProductRow = { id: string; name: string; sku: string | null; status: string; stock_quantity: number; price: number | null };
type ReviewRow = { id: string; reviewer_name: string; rating: number; title: string | null; body: string; status: string; created_at: string; products?: { name: string } | null };
type WorkspaceData = { staff: { role_key: string; permissions: Record<string, boolean> }; orders: OrderRow[]; customers: CustomerRow[]; products: ProductRow[]; reviews: ReviewRow[] };

export default function StaffWorkspace() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadWorkspace(authToken: string) {
    try {
      const response = await fetch("/api/staff/workspace", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your permitted workspace.");
      setWorkspace(data as WorkspaceData);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load workspace data."); }
  }

  async function updateWorkspace(action: string, id: string, value: string | number, field: "status" | "stock_quantity") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/staff/workspace", {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, [field]: value }), cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this item.");
      setMessage("Your update has been recorded."); await loadWorkspace(token);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update this item."); }
    finally { setBusy(false); }
  }

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
    if (saved) { setToken(saved); setEmail(savedEmail); void loadTasks(saved); void loadWorkspace(saved); }
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
      const workspaceResponse = await fetch("/api/staff/workspace", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const workspaceData = await workspaceResponse.json();
      if (!workspaceResponse.ok) throw new Error(workspaceData.error || "Could not load your permitted workspace.");
      sessionStorage.setItem("kaoma_staff_token", session.access_token);
      if (session.refresh_token) sessionStorage.setItem("kaoma_staff_refresh_token", session.refresh_token);
      sessionStorage.setItem("kaoma_staff_email", session.user?.email || loginEmail);
      setToken(session.access_token); setEmail(session.user?.email || loginEmail); setTasks(taskData.tasks || []); setWorkspace(workspaceData as WorkspaceData);
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
    setToken(""); setEmail(""); setTasks([]); setWorkspace(null); setMessage("You have signed out.");
  }

  if (!token) return <main className="staffAcceptShell"><section className="staffAcceptStory"><div><ClipboardCheck/><span>KAOMA PRIVATE OFFICE</span></div><h1>Every detail,<br/><i>moving forward.</i></h1><p>Your assigned work, deadlines and progress updates in one secure workspace.</p><small><ShieldCheck/> Protected staff access</small></section><section className="staffAcceptCard"><Image src="/kaoma-logo.webp" alt="KAOMA" width={220} height={48} priority/><p className="staffEyebrow">TEAM WORKSPACE</p><h2>Staff sign in</h2><p className="staffAcceptHint">Use the email and password you set when accepting your invitation.</p><form className="staffAcceptForm" onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="name@example.com"/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password"/></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in to workspace"}</button></form>{error && <div className="adminError" role="alert">{error}</div>}<a className="staffAcceptLink" href="/staff/accept">Accept a new invitation</a><p className="staffAcceptFoot"><ShieldCheck/> Your access is controlled by the KAOMA administrator.</p></section></main>;

  const openTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length;
  return <main className="staffWorkspaceShell"><header className="staffWorkspaceHeader"><Image src="/kaoma-logo.webp" alt="KAOMA" width={165} height={36}/><div><span>{email}</span><button type="button" onClick={logout}><LogOut size={16}/> Sign out</button></div></header><section className="staffWorkspaceIntro"><p className="staffEyebrow">YOUR KAOMA WORKSPACE</p><h1>Welcome to your task desk.</h1><p>Review your assignments, update progress and flag blockers for the administrator.</p></section>{message && <div className="adminSuccess">{message}</div>}{error && <div className="adminError">{error}</div>}<section className="staffWorkspaceStats"><article><ClipboardCheck/><b>{tasks.length}</b><span>Assigned tasks</span></article><article><Clock3/><b>{openTasks}</b><span>In progress / open</span></article><article><CheckCircle2/><b>{tasks.filter((t) => t.status === "completed").length}</b><span>Completed</span></article></section><section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Your assignments</h2><button type="button" className="secondary" onClick={() => void loadTasks(token)} disabled={loading}><RefreshCw size={16}/> Refresh</button></div>{loading ? <p>Loading your tasks…</p> : !tasks.length ? <div className="staffWorkspaceEmpty"><ClipboardCheck/><h3>No tasks assigned yet</h3><p>New assignments from your administrator will appear here.</p></div> : tasks.map((task) => <article className="staffTaskCard" key={task.id}><div className="staffTaskHead"><div><span className={`staffPriority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><p>{task.description || "No additional instructions."}</p></div><span className={`staffStatus ${task.status}`}>{task.status.replace("_", " ")}</span></div><div className="staffTaskMeta"><span>{task.work_area}</span><span>{task.due_at ? `Due ${new Date(task.due_at).toLocaleDateString()}` : "No due date"}</span></div><label className="staffProgressControl">Update progress<select disabled={busy} value={task.status} onChange={(e) => void updateStatus(task, e.target.value)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked — need help</option><option value="completed">Completed</option></select></label></article>)}</section>
    {workspace?.staff.permissions["orders.view"] && <section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Order desk</h2><span className="staffModuleBadge">Permission: orders.view</span></div>{!workspace.orders.length ? <p>No orders available.</p> : workspace.orders.map((order) => <article className="staffTaskCard" key={order.id}><div className="staffTaskHead"><div><h3>{order.order_number}</h3><p>{order.customer_email} · {order.currency} {Number(order.total).toLocaleString()}</p></div><span className={`staffStatus ${order.status}`}>{order.status}</span></div><div className="staffTaskMeta"><span>Payment: {order.payment_status}</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>{workspace.staff.permissions["orders.update"] && <label className="staffProgressControl">Update order status<select disabled={busy} value={order.status} onChange={(e) => void updateWorkspace("order.status", order.id, e.target.value, "status")}><option value="pending">Pending</option><option value="processing">Processing</option><option value="confirmed">Confirmed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label>}</article>)}</section>}
    {workspace?.staff.permissions["customers.view"] && <section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Customer directory</h2><span className="staffModuleBadge">Permission: customers.view</span></div>{!workspace.customers.length ? <p>No customer records available.</p> : workspace.customers.map((customer) => <article className="staffTaskCard" key={customer.user_id}><h3>{customer.full_name || customer.email || "Customer"}</h3><p>{customer.email || "No email"}{customer.phone ? ` · ${customer.phone}` : ""}</p><div className="staffTaskMeta"><span>{[customer.city, customer.country].filter(Boolean).join(", ") || "Location not provided"}</span><span>Joined {new Date(customer.created_at).toLocaleDateString()}</span></div></article>)}</section>}
    {workspace && (workspace.staff.permissions["products.view"] || workspace.staff.permissions["inventory.manage"] || workspace.staff.permissions["products.manage"]) && <section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Product & inventory desk</h2><span className="staffModuleBadge">Permission-scoped</span></div>{!workspace.products.length ? <p>No products available.</p> : workspace.products.map((product) => <article className="staffTaskCard" key={product.id}><div className="staffTaskHead"><div><h3>{product.name}</h3><p>{product.sku || "No SKU"} · {product.status}</p></div><span className="staffPriority normal">Stock {product.stock_quantity}</span></div>{workspace.staff.permissions["inventory.manage"] && <label className="staffProgressControl">Update stock<input type="number" min="0" max="10000000" defaultValue={product.stock_quantity} onBlur={(e) => { const value = Number(e.currentTarget.value); if (Number.isInteger(value) && value >= 0 && value !== product.stock_quantity) void updateWorkspace("product.stock", product.id, value, "stock_quantity"); }} /></label>}</article>)}</section>}
    {workspace?.staff.permissions["reviews.manage"] && <section className="staffWorkspaceTasks"><div className="staffWorkspaceTaskHeading"><h2>Review moderation</h2><span className="staffModuleBadge">Permission: reviews.manage</span></div>{!workspace.reviews.length ? <p>No reviews available.</p> : workspace.reviews.map((review) => <article className="staffTaskCard" key={review.id}><div className="staffTaskHead"><div><h3>{review.title || `Review by ${review.reviewer_name}`}</h3><p>{review.reviewer_name} · {review.rating}/5 · {review.products?.name || "Product review"}</p></div><span className={`staffStatus ${review.status}`}>{review.status}</span></div><p>{review.body}</p><label className="staffProgressControl">Review status<select disabled={busy} value={review.status} onChange={(e) => void updateWorkspace("review.status", review.id, e.target.value, "status")}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></article>)}</section>}
    <footer className="staffWorkspaceFooter"><ShieldCheck size={16}/> Your account can access only the modules granted by the KAOMA administrator. Updates are recorded in the activity log.</footer></main>;
}
