import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const db = await getDb();
      setRows(await db.select<any[]>(
        `SELECT p.*, i.invoice_no, c.name as client_name FROM payments p
         JOIN invoices i ON i.id = p.invoice_id JOIN clients c ON c.id = p.client_id
         ORDER BY p.payment_date DESC`
      ));
    })();
  }, []);
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">All payments recorded</p>
        </div>
        <Link to="/fees/payments/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Record Payment
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-500">Total Collected</div>
        <div className="text-2xl font-semibold text-emerald-600 mt-1">{formatCurrency(total)}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-500">No payments yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{p.payment_date}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.invoice_no}</td>
                <td className="px-4 py-3">{p.client_name}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3 text-xs capitalize">{p.method.replace("_", " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.reference_no || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
