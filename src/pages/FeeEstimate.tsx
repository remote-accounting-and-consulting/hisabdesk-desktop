import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { getDb } from "@/lib/db";

export default function FeeEstimate() {
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({});

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const cs = await db.select<any[]>("SELECT id, name, client_code FROM clients WHERE active=1 ORDER BY name");
      setClients(cs);
      if (cs.length > 0) setSelected(cs[0].id);
      const s = await db.select<any[]>("SELECT key, value FROM settings");
      const c: any = {};
      for (const r of s) c[r.key] = r.value;
      setCompany(c);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const db = await getDb();
      setServices(await db.select<any[]>(
        `SELECT s.name, cs.estimated_fee, cs.tax_amount FROM client_services cs
         JOIN services s ON s.id = cs.service_id WHERE cs.client_id = ? ORDER BY s.name`, [selected]));
    })();
  }, [selected]);

  const tf = services.reduce((s, r) => s + (r.estimated_fee || 0), 0);
  const tt = services.reduce((s, r) => s + (r.tax_amount || 0), 0);
  const grand = tf + tt;
  const client = clients.find((c) => c.id === selected);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Fee Estimate</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generate a fee proposal</p>
        </div>
        <div className="flex gap-2">
          <select value={selected || ""} onChange={(e) => setSelected(Number(e.target.value))}
            className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.client_code} — {c.name}</option>)}
          </select>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 print-area">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{company.company_name || "Remote Accounting and Consulting Pvt. Ltd."}</h2>
          {company.company_address && <p className="text-sm text-gray-600 dark:text-gray-400">{company.company_address}</p>}
          {company.company_pan && <p className="text-sm text-gray-600 dark:text-gray-400">PAN: {company.company_pan}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fee Estimate</p>
        </div>
        {client && (
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Client</div>
            <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{client.client_code}</div>
          </div>
        )}
        <table className="w-full text-sm mb-4">
          <thead className="border-b-2 border-gray-300 dark:border-slate-600">
            <tr>
              <th className="text-left py-2 text-gray-900 dark:text-white">Service</th>
              <th className="text-right py-2 text-gray-900 dark:text-white">Fee (Rs.)</th>
              <th className="text-right py-2 text-gray-900 dark:text-white">Tax (Rs.)</th>
              <th className="text-right py-2 text-gray-900 dark:text-white">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">No services assigned.</td></tr>}
            {services.map((s, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                <td className="py-2 text-gray-900 dark:text-gray-200">{s.name}</td>
                <td className="py-2 text-right text-gray-900 dark:text-gray-200">{s.estimated_fee.toLocaleString("en-IN")}</td>
                <td className="py-2 text-right text-gray-900 dark:text-gray-200">{s.tax_amount.toLocaleString("en-IN")}</td>
                <td className="py-2 text-right text-gray-900 dark:text-gray-200">{(s.estimated_fee + s.tax_amount).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
          {services.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-slate-600 font-semibold">
                <td className="py-2 text-gray-900 dark:text-white">Total</td>
                <td className="py-2 text-right text-gray-900 dark:text-white">{tf.toLocaleString("en-IN")}</td>
                <td className="py-2 text-right text-gray-900 dark:text-white">{tt.toLocaleString("en-IN")}</td>
                <td className="py-2 text-right text-gray-900 dark:text-white">{grand.toLocaleString("en-IN")}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-8">
          <p>This is an estimate only. Actual fees may vary.</p>
          <p className="mt-2">Generated: {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; color: black !important; background: white !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
