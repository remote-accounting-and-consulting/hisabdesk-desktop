import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { hardDeletePayment } from "@/lib/delete";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();
    setRows(await db.select<any[]>(
      `SELECT p.*, i.invoice_no, c.name as client_name
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       JOIN clients c ON c.id = p.client_id
       ORDER BY p.payment_date DESC`));
  }

  function handleDelete(p: any) {
    setConfirmState({
      open: true,
      title: "Delete Payment",
      message: `Invoice: ${p.invoice_no}\nClient: ${p.client_name}\nAmount: ${formatCurrency(p.amount)}\nDate: ${p.payment_date}\nMethod: ${p.method.replace("_", " ")}\n\nThe invoice balance will be recalculated.\n\nThis cannot be undone.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const result = await hardDeletePayment(p.id);
        if (!result.ok) { alert("Delete failed: " + result.message); return; }
        await logAudit("delete_payment", "payment", p.id, { invoice_no: p.invoice_no, amount: p.amount });
        load();
      },
    });
  }

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">All payments recorded</p>
        </div>
        <Link to="/fees/payments/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Record Payment
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Collected</div>
        <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(total)}</div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Client</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Method</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Reference</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {rows.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-500 dark:text-gray-400">No payments yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{p.payment_date}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-200">{p.invoice_no}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{p.client_name}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3 text-xs capitalize text-gray-700 dark:text-gray-300">{p.method.replace("_", " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{p.reference_no || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(p)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                    <Trash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Delete" danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </div>
  );
}
