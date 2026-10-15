"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, ClipboardCheck, MailPlus, RefreshCw, ShieldCheck, UserCog, Users, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

type View = "staff" | "tasks" | "activity";
type Staff = { user_id: string; email: string; full_name: string | null; role_key: string; permissions: Record<string, boolean>; status: string; invited_at: string; created_at: string };
type Task = { id: string; title: string; description: string | null; work_area: string; priority: string; status: string; assigned_to: string | null; due_at: string | null; created_at: string; staff_members?: { email?: string; full_name?: string | null; status?: string } | null };
type Event = { id: number; actor_email: string | null; action: string; target_type: string; target_id: string | null; details: Record<string, unknown>; created_at: string };

const permissionOptions = [
  ["orders.view", "View orders"], ["orders.update", "Update order status"],
  ["customers.view", "View customer directory"], ["products.view", "View products"],
  ["inventory.manage", "Update inventory quantities"], ["reviews.manage", "Moderate reviews"],
] as const;
const roleNames: Record<string, string> = {
  order_manager: "Order manager", product_manager: "Product manager",
  customer_support: "Customer support", inventory_delivery: "Inventory & delivery", custom: "Custom access",
};
const rolePermissions: Record<string, Record<string, boolean>> = {
  order_manager: { "orders.view": true, "orders.update": true, "customers.view": true },
  product_manager: { "products.view": true, "inventory.manage": true },
  customer_support: { "orders.view": true, "customers.view": true },
  inventory_delivery: { "orders.view": true, "orders.update": true, "products.view": true, "inventory.manage": true },
  custom: {},
};
const areas = ["general", "orders", "customers", "products", "inventory", "reviews", "marketing"];
const priorities = ["low", "normal", "high", "urgent"];
const statuses = ["todo", "in_progress", "blocked", "completed", "cancelled"];

export function AdminStaffManagement({ token, view }: { token: string; view: View }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("order_manager");
  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>(rolePermissions.order_manager);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskArea, setTaskArea] = useState("general");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [s, t, a] = await Promise.all([
        request("/api/admin/staff"),
        request("/api/admin/staff/tasks"),
        request("/api/admin/staff/audit"),
      ]);
      setStaff(s.staff || []);
      setTasks(t.tasks || []);
      setEvents(a.events || []);
      setDraftPermissions(Object.fromEntries((s.staff || []).map((member: Staff) => [member.user_id, member.permissions || {}])));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load staff management."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) void refresh(); }, [token]);

  const staffActive = useMemo(() => staff.filter((member) => member.status === "active").length, [staff]);
  const tasksOpen = useMemo(() => tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length, [tasks]);

  const toggleInvitePermission = (key: string, checked: boolean) => setInvitePermissions((current) => ({ ...current, [key]: checked }));
  const toggleMemberPermission = (userId: string, key: string, checked: boolean) => setDraftPermissions((current) => ({ ...current, [userId]: { ...(current[userId] || {}), [key]: checked } }));

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await request("/api/admin/staff", "POST", { email, full_name: name, role_key: role, permissions: invitePermissions });
      setMessage(`Invitation sent to ${result.staff.email}. They should check their inbox and spam folder.`);
      setName(""); setEmail(""); setInvitePermissions(rolePermissions[role] || {});
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not invite staff member."); }
    finally { setBusy(false); }
  }

  async function updateMember(member: Staff, patch: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/admin/staff", "PATCH", { user_id: member.user_id, ...patch }); setMessage(success); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update staff member."); }
    finally { setBusy(false); }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await request("/api/admin/staff/tasks", "POST", { title: taskTitle, description: taskDescription, work_area: taskArea, priority: taskPriority, assigned_to: taskAssignee || null, due_at: taskDue ? new Date(taskDue + "T23:59:00").toISOString() : null });
      setMessage("Task created and assigned."); setTaskTitle(""); setTaskDescription(""); setTaskAssignee(""); setTaskDue(""); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create task."); }
    finally { setBusy(false); }
  }

  async function updateTask(task: Task, patch: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/admin/staff/tasks", "PATCH", { id: task.id, ...patch }); setMessage("Task updated."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update task."); }
    finally { setBusy(false); }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete task “${task.title}”? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/admin/staff/tasks", "DELETE", { id: task.id }); setMessage("Task deleted."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete task."); }
    finally { setBusy(false); }
  }

  return <div className="adminSections">
    <section className="adminStats">
      <article><Users/><b>{staff.length}</b><span>Staff accounts</span></article>
      <article><ShieldCheck/><b>{staffActive}</b><span>Active staff</span></article>
      <article><ClipboardCheck/><b>{tasks.length}</b><span>Total tasks</span></article>
      <article><Clock3/><b>{tasksOpen}</b><span>Open tasks</span></article>
    </section>
    <article className="adminCard adminWide">
      <div className="staffPanelHeading">
        <div><p className="staffEyebrow">KAOMA PRIVATE OFFICE</p><h2>{view === "staff" ? "Staff & permissions" : view === "tasks" ? "Work assignments" : "Activity & audit trail"}</h2><p>{view === "staff" ? "Invite your team, set precise access and suspend accounts whenever needed." : view === "tasks" ? "Assign work, set priorities and due dates, and follow progress in one place." : "Review administrator actions and staff-management changes recorded by the system."}</p></div>
        <button type="button" className="secondary" onClick={() => void refresh()} disabled={loading || busy}><RefreshCw size={16}/> Refresh</button>
      </div>
      {message && <div className="adminSuccess" role="status">{message}</div>}
      {error && <div className="adminError" role="alert">{error}</div>}
      {loading ? <p>Loading secure staff workspace…</p> : null}

      {view === "staff" && <>
        <form className="staffInviteForm" onSubmit={invite}>
          <div className="staffFormTitle"><MailPlus/><div><h3>Invite a team member</h3><p>Supabase sends a secure invitation email. Access remains restricted by the permissions you choose.</p></div></div>
          <div className="staffFormGrid">
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Staff member name"/></label>
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com"/></label>
            <label>Starting role<select value={role} onChange={(e) => { setRole(e.target.value); setInvitePermissions(rolePermissions[e.target.value] || {}); }}>{Object.entries(roleNames).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          </div>
          <h4>Permissions for this invitation</h4>
          <div className="staffPermissionGrid">{permissionOptions.map(([key, label]) => <label key={key}><input type="checkbox" checked={invitePermissions[key] === true} onChange={(e) => toggleInvitePermission(key, e.target.checked)}/><span>{label}</span></label>)}</div>
          <p className="staffSafetyNote"><ShieldCheck size={16}/> Only the modules listed above are granted by this workspace. Staff cannot delete customer/order records or manage staff and store-wide settings.</p>
          <button className="primary" disabled={busy}><MailPlus size={16}/>{busy ? "Sending invitation…" : "Send secure invitation"}</button>
        </form>
        <h3 className="staffListTitle">Team directory</h3>
        <div className="staffDirectory">
          {!staff.length && <p>No staff have been invited yet.</p>}
          {staff.map((member) => <section className="staffMemberCard" key={member.user_id}>
            <div className="staffMemberTop"><div className="staffAvatar"><UserCog/></div><div className="staffMemberIdentity"><strong>{member.full_name || member.email}</strong><span>{member.email}</span><small>Invited {new Date(member.invited_at || member.created_at).toLocaleString()}</small></div><span className={`staffStatus ${member.status}`}>{member.status}</span></div>
            <div className="staffMemberControls">
              <label>Role<select value={member.role_key} onChange={(e) => void updateMember(member, { role_key: e.target.value, permissions: rolePermissions[e.target.value] || {} }, "Staff role and default permissions updated.")}>{Object.entries(roleNames).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
              <label>Account status<select value={member.status} onChange={(e) => void updateMember(member, { status: e.target.value }, "Staff account status updated.")}><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select></label>
            </div>
            <details className="staffPermissionEditor"><summary>Review and edit permissions</summary><div className="staffPermissionGrid">{permissionOptions.map(([key, label]) => <label key={key}><input type="checkbox" checked={draftPermissions[member.user_id]?.[key] === true} onChange={(e) => toggleMemberPermission(member.user_id, key, e.target.checked)}/><span>{label}</span></label>)}</div><button type="button" className="primary" disabled={busy} onClick={() => void updateMember(member, { permissions: draftPermissions[member.user_id] || {} }, "Staff permissions saved.")}>Save permissions</button></details>
          </section>)}
        </div>
      </>}

      {view === "tasks" && <>
        <form className="staffInviteForm" onSubmit={createTask}>
          <div className="staffFormTitle"><ClipboardCheck/><div><h3>Create and assign work</h3><p>Each task is linked to the staff member responsible, with status and priority tracked.</p></div></div>
          <div className="staffFormGrid">
            <label className="staffFieldWide">Task title<input required maxLength={180} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Prepare new product collection"/></label>
            <label>Work area<select value={taskArea} onChange={(e) => setTaskArea(e.target.value)}>{areas.map((area) => <option key={area} value={area}>{area.charAt(0).toUpperCase() + area.slice(1)}</option>)}</select></label>
            <label>Priority<select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>{priorities.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></label>
            <label>Assign to<select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}><option value="">Unassigned</option>{staff.filter((member) => ["invited", "active"].includes(member.status)).map((member) => <option value={member.user_id} key={member.user_id}>{member.full_name || member.email}</option>)}</select></label>
            <label>Due date<input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)}/></label>
            <label className="staffFieldWide">Instructions<textarea rows={3} maxLength={4000} value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Describe the expected result, checklist or hand-off notes."/></label>
          </div>
          <button className="primary" disabled={busy}><ClipboardCheck size={16}/>{busy ? "Saving task…" : "Create task"}</button>
        </form>
        <div className="staffTaskList">
          {!tasks.length && <p>No tasks created yet.</p>}
          {tasks.map((task) => <article className="staffTaskCard" key={task.id}>
            <div className="staffTaskHead"><div><span className={`staffPriority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><p>{task.description || "No additional instructions."}</p></div><button type="button" className="secondary" disabled={busy} onClick={() => void deleteTask(task)}>Delete task</button></div>
            <div className="staffTaskMeta"><span>{task.work_area}</span><span>{task.staff_members?.full_name || task.staff_members?.email || staff.find((m) => m.user_id === task.assigned_to)?.email || "Unassigned"}</span><span>{task.due_at ? `Due ${new Date(task.due_at).toLocaleDateString()}` : "No due date"}</span></div>
            <div className="staffTaskActions"><label>Status<select value={task.status} disabled={busy} onChange={(e) => void updateTask(task, { status: e.target.value })}>{statuses.map((s) => <option value={s} key={s}>{s.replace("_", " ")}</option>)}</select></label><label>Assignee<select value={task.assigned_to || ""} disabled={busy} onChange={(e) => void updateTask(task, { assigned_to: e.target.value || null })}><option value="">Unassigned</option>{staff.filter((m) => ["invited", "active"].includes(m.status)).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}</select></label></div>
          </article>)}
        </div>
      </>}

      {view === "activity" && <>
        <div className="staffAuditIntro"><Activity/><p>Showing the latest {events.length} recorded events. Invitation and task changes are recorded automatically; further store actions can be added to this audit trail as their server endpoints are integrated.</p></div>
        <div className="staffAuditList">
          {!events.length && <p>No staff activity recorded yet.</p>}
          {events.map((event) => <article key={event.id} className="staffAuditEvent"><div className="staffAuditIcon">{event.action.includes("deleted") ? <AlertTriangle/> : event.action.includes("completed") ? <CheckCircle2/> : <Activity/>}</div><div><strong>{event.action.replace(/[._]/g, " ")}</strong><p>{event.actor_email || "System"} · {event.target_type}{event.target_id ? ` · ${event.target_id}` : ""}</p><small>{new Date(event.created_at).toLocaleString()}</small><details><summary>Event details</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details></div></article>)}
        </div>
      </>}
    </article>
  </div>;
}
