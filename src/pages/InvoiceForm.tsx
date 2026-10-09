import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    invoice_no: "", client_id: "", service_id: "",
    invoice_date: new Date().toISOString().slice(0, 10), due_date: "",
    service_fee: "", tax_amount: "", remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      setClients(await db.select<any[]>("SELECT id, name, client_code FROM clients WHERE active=1 ORDER BY name"));
      setServices(await db.select<any[]>("SELECT id, name FROM services WHERE active=1 ORDER BY name"));
      if (isEdit) {
        const [inv] = await db.select<any[]>("SELECT * FROM invoices WHERE id=?", [id]);
        if (inv) setForm({
          invoice_no: inv.invoice_no || "", client_id: String(inv.client_id || ""),
          service_id: String(inv.service_id || ""), invoice_date: inv.invoice_date || "",
          due_date: inv.due_date || "", service_fee: String(inv.service_fee || ""),
          tax_amount: String(inv.tax_amount || ""), remarks: inv.remarks || "",
        });
      } else {
        const [last] = await db.select<any[]>("SELECT invoice_no FROM invoices ORDER BY id DESC LIMIT 1");
        let next = 1;
        if (last?.invoice_no) {
          const m = String(last.invoice_no).match(/(\d+)$/);
          if (m) next = parseInt(m[1], 10) + 1;
        }
        setForm((f) => ({ ...f, invoice_no: `INV-${String(next).padStart(4, "0")}` }));
      }
    })();
  }, [id]);

  const total = (Number(form.service_fee) || 0) + (Number(form.tax_amount) || 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const db = await getDb();
      const sf = Number(form.service_fee) || 0;
      const ta = Number(form.tax_amount) || 0;
      const tt = sf + ta;
      if (isEdit) {
        await db.execute(
          `UPDATE invoices SET invoice_no=?, client_id=?, service_id=?, invoice_date=?, due_date=?, service_fee=?, tax_amount=?, total_amount=?, remarks=? WHERE id=?`,
          [form.invoice_no, Number(form.client_id), form.service_id ? Number(form.service_id) : null, form.invoice_date, form.due_date || null, sf, ta, tt, form.remarks || null, id]);
      } else {
        await db.execute(
          `INSERT INTO invoices (invoice_no, client_id, service_id, invoice_date, due_date, service_fee, tax_amount, total_amount, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
          [form.invoice_no, Number(form.client_id), form.service_id ? Number(form.service_id) : null, form.invoice_date, form.due_date || null, sf, ta, tt, form.remarks || null]);
      }
      await logAudit(isEdit ? "update_invoice" : "create_invoice", "invoice", isEdit ? Number(id) : null);
      navigate("/fees");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{isEdit ? "Edit Invoice" : "New Invoice"}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create a fee invoice</p>
      </div>
      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Invoice No. *"><input required value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} className="input" /></Field>
          <Field label="Client *">
            <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input">
              <option value="">— Select Client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.client_code} — {c.name}</option>)}
            </select>
          </Field>
          <Field label="Service">
            <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="input">
              <option value="">— Select Service —</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Invoice Date *"><input required type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="input" /></Field>
          <Field label="Due Date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input" /></Field>
          <Field label="Service Fee (Rs.) *"><input required type="number" min="0" step="0.01" value={form.service_fee} onChange={(e) => setForm({ ...form, service_fee: e.target.value })} className="input" /></Field>
          <Field label="Tax Amount (Rs.)"><input type="number" min="0" step="0.01" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} className="input" /></Field>
          <Field label="Total">
            <div className="input bg-gray-50 dark:bg-slate-900 font-semibold">Rs. {total.toLocaleString("en-IN")}</div>
          </Field>
          <Field label="Remarks" full><textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input" /></Field>
        </div>
        {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : isEdit ? "Update" : "Create"}</button>
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
