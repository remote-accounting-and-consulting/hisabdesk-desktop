import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";

export default function WorkForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [form, setForm] = useState({
    client_id: "", service_id: "", title: "", fiscal_year: "2083/84",
    priority: "medium", status: "not_started",
    start_date: new Date().toISOString().slice(0, 10), due_date: "",
    estimated_hours: "", assigned_staff_id: "", supervisor_id: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      setClients(await db.select<any[]>("SELECT id, name, client_code FROM clients WHERE active = 1 ORDER BY name"));
      setServices(await db.select<any[]>("SELECT id, name FROM services WHERE active=1 ORDER BY name"));
      setStaff(await db.select<any[]>("SELECT id, name FROM staff WHERE active=1 ORDER BY name"));
      if (isEdit) {
        const [w] = await db.select<any[]>("SELECT * FROM work_assignments WHERE id = ?", [id]);
        if (w) setForm({
          client_id: String(w.client_id || ""), service_id: String(w.service_id || ""),
          title: w.title || "", fiscal_year: w.fiscal_year || "2083/84",
          priority: w.priority || "medium", status: w.status || "not_started",
          start_date: w.start_date || "", due_date: w.due_date || "",
          estimated_hours: w.estimated_hours ? String(w.estimated_hours) : "",
          assigned_staff_id: String(w.assigned_staff_id || ""),
          supervisor_id: String(w.supervisor_id || ""), notes: w.notes || "",
        });
      }
    })();
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const db = await getDb();
      const payload = [
        Number(form.client_id), Number(form.service_id), form.title || null, form.fiscal_year || null,
        form.priority, form.status, form.start_date || null, form.due_date || null,
        form.estimated_hours ? Number(form.estimated_hours) : null,
        form.assigned_staff_id ? Number(form.assigned_staff_id) : null,
        form.supervisor_id ? Number(form.supervisor_id) : null, form.notes || null,
      ];
      if (isEdit) {
        await db.execute(
          `UPDATE work_assignments SET client_id=?, service_id=?, title=?, fiscal_year=?, priority=?, status=?, start_date=?, due_date=?, estimated_hours=?, assigned_staff_id=?, supervisor_id=?, notes=?, updated_at=datetime('now') WHERE id=?`,
          [...payload, id]
        );
        await logAudit("update_work", "work", Number(id));
      } else {
        const result = await db.execute(
          `INSERT INTO work_assignments (client_id, service_id, title, fiscal_year, priority, status, start_date, due_date, estimated_hours, assigned_staff_id, supervisor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          payload
        );
        await logAudit("create_work", "work", Number((result as any).lastInsertId));
      }
      navigate("/work");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{isEdit ? "Edit Work" : "New Work Assignment"}</h1>
        <p className="text-sm text-gray-500">Assign work with priority and deadline</p>
      </div>
      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client *">
            <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input">
              <option value="">— Select Client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.client_code} — {c.name}</option>)}
            </select>
          </Field>
          <Field label="Service *">
            <select required value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="input">
              <option value="">— Select Service —</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Title" full>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Audit 2083/84" className="input" />
          </Field>
          <Field label="Fiscal Year"><input value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} className="input" /></Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="not_started">Not Started</option><option value="started">Started</option>
              <option value="wip">WIP</option><option value="due_today">Due Today</option>
              <option value="due_soon">Due Soon</option><option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Start Date"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" /></Field>
          <Field label="Due Date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input" /></Field>
          <Field label="Estimated Hours"><input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} className="input" /></Field>
          <Field label="Assigned Staff">
            <select value={form.assigned_staff_id} onChange={(e) => setForm({ ...form, assigned_staff_id: e.target.value })} className="input">
              <option value="">— Unassigned —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Supervisor">
            <select value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })} className="input">
              <option value="">— None —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" full><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" /></Field>
        </div>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : isEdit ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: any) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
