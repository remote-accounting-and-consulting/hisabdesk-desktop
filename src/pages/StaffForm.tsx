import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";

export default function StaffForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ staff_code: "", name: "", position: "", contact: "", email: "", active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) {
      (async () => {
        const db = await getDb();
        const [r] = await db.select<any[]>("SELECT staff_code FROM staff ORDER BY id DESC LIMIT 1");
        let next = 1;
        if (r?.staff_code) {
          const m = String(r.staff_code).match(/(\d+)$/);
          if (m) next = parseInt(m[1], 10) + 1;
        }
        setForm((f) => ({ ...f, staff_code: `ST${String(next).padStart(3, "0")}` }));
      })();
      return;
    }
    (async () => {
      const db = await getDb();
      const [r] = await db.select<any[]>("SELECT * FROM staff WHERE id = ?", [id]);
      if (r) setForm({ staff_code: r.staff_code || "", name: r.name || "", position: r.position || "", contact: r.contact || "", email: r.email || "", active: r.active === 1 });
    })();
  }, [id, isEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const db = await getDb();
      if (isEdit) {
        await db.execute(
          "UPDATE staff SET staff_code=?, name=?, position=?, contact=?, email=?, active=? WHERE id=?",
          [form.staff_code, form.name, form.position || null, form.contact || null, form.email || null, form.active ? 1 : 0, id]);
        await logAudit("update_staff", "staff", Number(id));
      } else {
        const result = await db.execute(
          "INSERT INTO staff (staff_code, name, position, contact, email, active) VALUES (?, ?, ?, ?, ?, ?)",
          [form.staff_code, form.name, form.position || null, form.contact || null, form.email || null, form.active ? 1 : 0]);
        await logAudit("create_staff", "staff", Number((result as any).lastInsertId));
      }
      navigate("/staff");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{isEdit ? "Edit Staff" : "Add New Staff"}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{isEdit ? "Update staff information" : "Register a staff member"}</p>
      </div>
      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Staff Code *">
            <input required value={form.staff_code} onChange={(e) => setForm({ ...form, staff_code: e.target.value })} className="input" />
          </Field>
          <Field label="Full Name *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Position">
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Senior Accountant" className="input" />
          </Field>
          <Field label="Contact">
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input" />
          </Field>
          <Field label="Email" full>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Status" full>
            <label className="flex items-center gap-2 pt-1 text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
          </Field>
        </div>
        {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
