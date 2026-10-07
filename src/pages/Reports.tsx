import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default function Reports() {
  const [data, setData] = useState<any>({});
  useEffect(() => {
    (async () => {
      const db = await getDb();
      const byProvince = await db.select<any[]>(`SELECT p.name as label, COUNT(c.id) as value FROM provinces p LEFT JOIN clients c ON c.province_id = p.id GROUP BY p.id HAVING value > 0 ORDER BY value DESC`);
      const byDistrict = await db.select<any[]>(`SELECT d.name as label, COUNT(c.id) as value FROM districts d LEFT JOIN clients c ON c.district_id = d.id GROUP BY d.id HAVING value > 0 ORDER BY value DESC`);
      const byCategory = await db.select<any[]>(`SELECT bc.name as label, COUNT(c.id) as value FROM business_categories bc LEFT JOIN clients c ON c.business_category_id = bc.id GROUP BY bc.id HAVING value > 0 ORDER BY value DESC`);
      const byRegType = await db.select<any[]>(`SELECT rt.name as label, COUNT(c.id) as value FROM registration_types rt LEFT JOIN clients c ON c.registration_type_id = rt.id GROUP BY rt.id HAVING value > 0 ORDER BY value DESC`);
      const byService = await db.select<any[]>(`SELECT s.name as label, COUNT(cs.id) as value, COALESCE(SUM(cs.estimated_fee),0) as revenue FROM services s LEFT JOIN client_services cs ON cs.service_id = s.id GROUP BY s.id HAVING value > 0 ORDER BY value DESC`);
      const byStaff = await db.select<any[]>(`SELECT st.name as label, COUNT(w.id) as value FROM staff st LEFT JOIN work_assignments w ON w.assigned_staff_id = st.id AND w.status != 'completed' GROUP BY st.id HAVING value > 0 ORDER BY value DESC`);
      const clientReceivables = await db.select<any[]>(
        `SELECT c.name as label, COALESCE(SUM(i.total_amount),0) as total, COALESCE(SUM(i.paid_amount),0) as paid, COALESCE(SUM(i.total_amount - i.paid_amount),0) as outstanding, CAST(julianday('now') - julianday(MIN(CASE WHEN i.paid_amount < i.total_amount THEN i.invoice_date END)) AS INTEGER) as days FROM clients c LEFT JOIN invoices i ON i.client_id = c.id WHERE c.active=1 GROUP BY c.id HAVING outstanding > 0 ORDER BY outstanding DESC LIMIT 30`
      );
      const monthlyCollection = await db.select<any[]>(`SELECT strftime('%Y-%m', payment_date) as label, COALESCE(SUM(amount),0) as value FROM payments GROUP BY label ORDER BY label DESC LIMIT 12`);
      const vatByStatus = await db.select<any[]>(`SELECT status as label, COUNT(*) as value FROM vat_tracking GROUP BY status`);
      const vatByMonth = await db.select<any[]>(`SELECT month_name as label, COUNT(*) as total, SUM(CASE WHEN status='filed' THEN 1 ELSE 0 END) as filed, SUM(CASE WHEN status IN ('pending','late') THEN 1 ELSE 0 END) as pending FROM vat_tracking GROUP BY month_index ORDER BY month_index`);
      const clientWork = await db.select<any[]>(`SELECT c.name as label, COUNT(w.id) as value FROM clients c LEFT JOIN work_assignments w ON w.client_id = c.id GROUP BY c.id HAVING value > 0 ORDER BY value DESC LIMIT 20`);
      const [totals] = await db.select<any[]>(
        `SELECT (SELECT COUNT(*) FROM clients WHERE active=1) as clients, (SELECT COUNT(*) FROM work_assignments WHERE status != 'completed') as pending_work, (SELECT COALESCE(SUM(total_amount - paid_amount),0) FROM invoices WHERE status != 'cancelled') as receivable`
      );
      setData({ byProvince, byDistrict, byCategory, byRegType, byService, byStaff, clientReceivables, monthlyCollection, vatByStatus, vatByMonth, clientWork, totals });
    })();
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Client, work, financial, VAT analytics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Active Clients" value={data.totals?.clients || 0} />
        <Card label="Pending Work" value={data.totals?.pending_work || 0} />
        <Card label="Total Receivable" value={formatCurrency(data.totals?.receivable || 0)} tone="danger" />
      </div>
      <Section title="Client Reports">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Bar title="By Province" rows={data.byProvince || []} />
          <Bar title="By District" rows={data.byDistrict || []} />
          <Bar title="By Business" rows={data.byCategory || []} />
          <Bar title="By Registration" rows={data.byRegType || []} />
        </div>
      </Section>
      <Section title="Work Reports">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Bar title="Staff Workload" rows={data.byStaff || []} />
          <Bar title="Client-wise Work" rows={data.clientWork || []} />
        </div>
      </Section>
      <Section title="Financial Reports">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Bar title="Services" rows={data.byService || []} showRevenue />
          <Bar title="VAT Status" rows={data.vatByStatus || []} />
        </div>
        <h3 className="font-medium text-gray-700 mb-3">Client-wise Receivable</h3>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr><th className="text-left py-2">Client</th><th className="text-right py-2">Total</th><th className="text-right py-2">Paid</th><th className="text-right py-2">Outstanding</th><th className="text-right py-2">Days</th></tr>
          </thead>
          <tbody>
            {(data.clientReceivables || []).length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-500">No receivables.</td></tr>}
            {(data.clientReceivables || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2">{r.label}</td>
                <td className="py-2 text-right">{formatCurrency(r.total)}</td>
                <td className="py-2 text-right">{formatCurrency(r.paid)}</td>
                <td className="py-2 text-right font-medium text-red-600">{formatCurrency(r.outstanding)}</td>
                <td className="py-2 text-right text-xs">{r.days || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="font-medium text-gray-700 mt-8 mb-3">Monthly Collection</h3>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase"><tr><th className="text-left py-2">Month</th><th className="text-right py-2">Collected</th></tr></thead>
          <tbody>
            {(data.monthlyCollection || []).length === 0 && <tr><td colSpan={2} className="text-center py-6 text-gray-500">No payment data.</td></tr>}
            {(data.monthlyCollection || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-gray-100"><td className="py-2">{r.label}</td><td className="py-2 text-right">{formatCurrency(r.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="VAT Reports">
        <h3 className="font-medium text-gray-700 mb-3">Month-wise VAT Status</h3>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr><th className="text-left py-2">Month</th><th className="text-right py-2">Total</th><th className="text-right py-2">Filed</th><th className="text-right py-2">Pending</th></tr>
          </thead>
          <tbody>
            {(data.vatByMonth || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2">{r.label}</td>
                <td className="py-2 text-right">{r.total}</td>
                <td className="py-2 text-right text-emerald-600">{r.filed}</td>
                <td className="py-2 text-right text-amber-600">{r.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Card({ label, value, tone = "default" }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tone === "danger" ? "text-red-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
function Section({ title, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
function Bar({ title, rows, showRevenue }: any) {
  const max = Math.max(...rows.map((r: any) => r.value), 1);
  return (
    <div>
      <h3 className="font-medium text-gray-700 mb-3">{title}</h3>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
        {rows.map((r: any, i: number) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{r.label}</span>
              <span className="text-gray-500">
                {r.value}
                {showRevenue && r.revenue > 0 && <span className="ml-2 text-xs text-gray-400">({formatCurrency(r.revenue)})</span>}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
