import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Wallet, FileText, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { formatCurrency, daysOutstanding } from "@/lib/utils";
import { hardDeleteInvoice } from "@/lib/delete";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Fees() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, [filter]);

  async function load() {
    const db = await getDb();
    let q = `SELECT i.*, c.name as client_name, s.name as service_name,
        (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id) as payment_count
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      LEFT JOIN services s ON s.id = i.service_id
      WHERE i.status != 'cancelled'`;
    const p: any[] = [];
    if (filter !== "all") { q += " AND i.status = ?"; p.push(filter); }
    q += " ORDER BY i.invoice_date DESC";
    setInvoices(await db.select<any[]>(q, p));
  }

  function handleDelete(inv: any) {
    const lines: string[] = [
      `Invoice: ${inv.invoice_no}`,
      `Client: ${inv.client_name}`,
      `Amount: ${formatCurrency(inv.total_amount)}`,
      `Paid: ${formatCurrency(inv.paid_amount)}`,
    ];
    if (inv.payment_count > 0) lines.push(`Payments: ${inv.payment_count} payment(s) will be deleted`);
    setConfirmState({
      open: true,
      title: "Delete Invoice",
      message: lines.join("\n") + `\n\nThis will permanently delete the invoice` + (inv.payment_count > 0 ? " and all its payments" : "") + `.\n\nThis cannot be undone.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const result = await hardDeleteInvoice(inv.id);
        if (!result.ok) { alert("Delete failed: " + result.message); return; }
        await logAudit("delete_invoice", "invoice", inv.id, { invoice_no: inv.invoice_no, stats: result.stats });
        load();
      },
    });
  }

  const totals = invoices.reduce((a, i) => {
    a.total += i.total_amount || 0; a.paid += i.paid_amount || 0;
    a.outstanding += (i.total_amount || 0) - (i.paid_amount || 0);
    return a;
  }, { total: 0, paid: 0, outstanding: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Fees & Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Invoices and outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Link to="/fees/estimate" className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium">
            <FileText size={16} /> Fee Estimate
          </Link>
          <Link to="/fees/payments" className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium">
            <Wallet size={16} /> Payments
          </Link>
          <Link to="/fees/invoices/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> New Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SC label="Total Billed" value={formatCurrency(totals.total)} />
        <SC label="Total Collected" value={formatCurrency(totals.paid)} tone="success" />
        <SC label="Outstanding" value={formatCurrency(totals.outstanding)} tone="danger" />
      </div>

      <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 w-fit">
        {(["all", "unpaid", "partial", "paid"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Service</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Balance</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {invoices.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-500 dark:text-gray-400">No invoices.</td></tr>}
            {invoices.map((inv) => {
              const bal = inv.total_amount - inv.paid_amount;
              const days = bal > 0 ? daysOutstanding(inv.invoice_date) : 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-200">{inv.invoice_no}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{inv.client_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{inv.service_name || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">{formatCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(bal)}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {days > 0 ? <span className={days > 30 ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-600 dark:text-gray-400"}>{days}</span> : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      {bal > 0 && <Link to={`/fees/payments/new?invoice=${inv.id}`} className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">Pay</Link>}
                      <Link to={`/fees/invoices/${inv.id}/edit`} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">Edit</Link>
                      <button onClick={() => handleDelete(inv)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Delete" danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </div>
  );
}

function SC({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const c = tone === "danger" ? "text-red-600 dark:text-red-400" : tone === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${c}`}>{value}</div>
    </div>
  );
}
