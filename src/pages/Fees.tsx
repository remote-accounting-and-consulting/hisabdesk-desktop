import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Wallet, FileText } from "lucide-react";
import { getDb } from "@/lib/db";
import { formatCurrency, daysOutstanding } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

export default function Fees() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");

  useEffect(() => { load(); }, [filter]);

  async function load() {
    const db = await getDb();
    let q = `SELECT i.*, c.name as client_name, s.name as service_name FROM invoices i JOIN clients c ON c.id = i.client_id LEFT JOIN services s ON s.id = i.service_id WHERE i.status != 'cancelled'`;
    const p: any[] = [];
    if (filter !== "all") { q += " AND i.status = ?"; p.push(filter); }
    q += " ORDER BY i.invoice_date DESC";
    setInvoices(await db.select<any[]>(q, p));
  }

  const totals = invoices.reduce((a, i) => {
    a.total += i.total_amount || 0;
    a.paid += i.paid_amount || 0;
    a.outstanding += (i.total_amount || 0) - (i.paid_amount || 0);
    return a;
  }, { total: 0, paid: 0, outstanding: 0 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fees & Payments</h1>
          <p className="text-sm text-gray-500">Invoices and outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Link to="/fees/estimate" className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
            <FileText size={16} /> Fee Estimate
          </Link>
          <Link to="/fees/payments" className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
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

      <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {(["all", "unpaid", "partial", "paid"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-md font-medium ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-500">No invoices.</td></tr>}
            {invoices.map((inv) => {
              const bal = inv.total_amount - inv.paid_amount;
              const days = bal > 0 ? daysOutstanding(inv.invoice_date) : 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                  <td className="px-4 py-3">{inv.client_name}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.service_name || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(bal)}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {days > 0 ? <span className={days > 30 ? "text-red-600 font-medium" : "text-gray-600"}>{days}</span> : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {bal > 0 && <Link to={`/fees/payments/new?invoice=${inv.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Pay</Link>}
                    <Link to={`/fees/invoices/${inv.id}/edit`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SC({ label, value, tone = "default" }: any) {
  const c = tone === "danger" ? "text-red-600" : tone === "success" ? "text-emerald-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${c}`}>{value}</div>
    </div>
  );
}
