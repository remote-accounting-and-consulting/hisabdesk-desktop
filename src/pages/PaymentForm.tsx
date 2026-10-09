import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default function PaymentForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pre = params.get("invoice");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState({
    invoice_id: pre || "", payment_date: new Date().toISOString().slice(0, 10),
    amount: "", method: "cash", bank_account: "", reference_no: "", remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      setInvoices(await db.select<any[]>(
        `SELECT i.id, i.invoice_no, i.total_amount, i.paid_amount, i.client_id, c.name as client_name
         FROM invoices i JOIN clients c ON c.id = i.client_id
         WHERE i.status != 'cancelled' AND i.paid_amount < i.total_amount
         ORDER BY i.invoice_date DESC`));
    })();
  }, []);

  const sel = invoices.find((i) => String(i.id) === form.invoice_id);
  const bal = sel ? sel.total_amount - sel.paid_amount : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const db = await getDb();
      const amt = Number(form.amount) || 0;
      if (!form.invoice_id) throw new Error("Select an invoice");
      if (amt <= 0) throw new Error("Amount must be > 0");
      if (amt > bal + 0.01) throw new Error(`Exceeds balance (${formatCurrency(bal)})`);
      await db.execute(
        `INSERT INTO payments (invoice_id, client_id, payment_date, amount, method, bank_account, reference_no, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [Number(form.invoice_id), sel.client_id, form.payment_date, amt, form.method, form.bank_account || null, form.reference_no || null, form.remarks || null]);
      const newPaid = sel.paid_amount + amt;
      const newStatus = newPaid >= sel.total_amount - 0.01 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
      await db.execute("UPDATE invoices SET paid_amount=?, status=? WHERE id=?", [newPaid, newStatus, form.invoice_id]);
      await logAudit("record_payment", "payment", Number(form.invoice_id), { amount: amt });
      navigate("/fees");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Record Payment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Enter a payment against an invoice</p>
      </div>
      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <Field label="Invoice *">
          <select required value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value, amount: "" })} className="input">
            <option value="">— Select Invoice —</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>{i.invoice_no} — {i.client_name} — Balance {formatCurrency(i.total_amount - i.paid_amount)}</option>
            ))}
          </select>
        </Field>
        {sel && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-sm grid grid-cols-3 gap-2 text-gray-900 dark:text-gray-200">
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Total:</span> {formatCurrency(sel.total_amount)}</div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Paid:</span> {formatCurrency(sel.paid_amount)}</div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Balance:</span> <strong>{formatCurrency(bal)}</strong></div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Payment Date *"><input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="input" /></Field>
          <Field label="Amount (Rs.) *"><input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={bal > 0 ? String(bal) : ""} className="input" /></Field>
          <Field label="Method *">
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="input">
              <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Bank / Account"><input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} className="input" /></Field>
          <Field label="Reference No."><input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} className="input" /></Field>
          <Field label="Remarks" full><textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input" /></Field>
        </div>
        {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : "Record Payment"}</button>
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
