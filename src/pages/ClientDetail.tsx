import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import DocumentUploader from "@/components/DocumentUploader";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [work, setWork] = useState<any[]>([]);
  const [fees, setFees] = useState({ total: 0, paid: 0, outstanding: 0 });
  const [vat, setVat] = useState<any[]>([]);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const db = await getDb();
    const [c] = await db.select<any[]>(
      `SELECT c.*, rt.name as registration_type, bc.name as business_category,
      p.name as province, d.name as district,
      l.name as local_level, l.type as local_level_type
      FROM clients c
      LEFT JOIN registration_types rt ON rt.id = c.registration_type_id
      LEFT JOIN business_categories bc ON bc.id = c.business_category_id
      LEFT JOIN provinces p ON p.id = c.province_id
      LEFT JOIN districts d ON d.id = c.district_id
      LEFT JOIN local_levels l ON l.id = c.local_level_id
      WHERE c.id = ?`, [id]
    );
    setClient(c);

    setDocs(await db.select<any[]>(
      `SELECT dt.id, dt.name, cd.status FROM document_types dt
       LEFT JOIN client_documents cd ON cd.document_type_id = dt.id AND cd.client_id = ?
       ORDER BY dt.sort_order`, [id]
    ));
    setServices(await db.select<any[]>(
      `SELECT cs.id, s.name, cs.estimated_fee, cs.tax_amount
       FROM client_services cs JOIN services s ON s.id = cs.service_id
       WHERE cs.client_id = ? ORDER BY s.name`, [id]
    ));
    setWork(await db.select<any[]>(
      `SELECT w.*, s.name as service_name, st.name as staff_name
       FROM work_assignments w JOIN services s ON s.id = w.service_id
       LEFT JOIN staff st ON st.id = w.assigned_staff_id
       WHERE w.client_id = ? ORDER BY w.due_date DESC`, [id]
    ));
    const [f] = await db.select<any[]>(
      `SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(total_amount - paid_amount),0) as outstanding FROM invoices WHERE client_id = ?`, [id]
    );
    setFees(f || { total: 0, paid: 0, outstanding: 0 });
    setVat(await db.select<any[]>("SELECT * FROM vat_tracking WHERE client_id = ? ORDER BY month_index", [id]));
  }

  if (!client) return <div className="text-gray-500">Loading...</div>;
  const docComplete = docs.filter((d) => d.status === "yes").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500 font-mono">{client.client_code}</div>
          <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
          <p className="text-sm text-gray-500">{client.registration_type || "—"} · {client.business_category || "—"}</p>
        </div>
        <Link to={`/clients/${id}/edit`} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Edit</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Documents" value={`${docComplete}/${docs.length}`} />
        <SummaryCard label="Services" value={services.length} />
        <SummaryCard label="Total Fees" value={formatCurrency(fees.total)} />
        <SummaryCard label="Outstanding" value={formatCurrency(fees.outstanding)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Client Information">
          <InfoRow label="PAN" value={client.pan_no} />
          <InfoRow label="Authorised Person" value={client.authorised_person} />
          <InfoRow label="Contact" value={client.contact_number} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow
            label="Address"
            value={[
              client.address_line,
              client.ward_no ? `Ward ${client.ward_no}` : null,
              client.local_level && client.local_level_type
                ? `${client.local_level} (${client.local_level_type})`
                : client.local_level,
              client.district,
              client.province,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <InfoRow label="Category" value={client.category === "regular" ? "Regular" : "One-Time"} />
        </Section>
        <Section title="Documents">
          {docs.map((d) => (
            <div key={d.id} className="py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">{d.name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.status === "yes" ? "bg-emerald-100 text-emerald-800" : d.status === "partial" ? "bg-amber-100 text-amber-800" : d.status === "na" ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-800"}`}>
                  {d.status ? d.status.toUpperCase() : "NO"}
                </span>
              </div>
              <DocumentUploader clientId={Number(id)} clientCode={client.client_code} documentTypeId={d.id} documentTypeName={d.name} />
            </div>
          ))}
        </Section>
      </div>

      <Section title="Services" action={<Link to={`/clients/${id}/services`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"><Settings2 size={12} /> Manage Services</Link>}>
        {services.length === 0 ? <p className="text-sm text-gray-500">No services selected.</p> : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr><th className="text-left py-2">Service</th><th className="text-right py-2">Fee</th><th className="text-right py-2">Tax</th></tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 text-right">{formatCurrency(s.estimated_fee)}</td>
                  <td className="py-2 text-right">{formatCurrency(s.tax_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Work Assignments">
        {work.length === 0 ? <p className="text-sm text-gray-500">No work yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr><th className="text-left py-2">Service</th><th className="text-left py-2">Due</th><th className="text-left py-2">Staff</th><th className="text-left py-2">Status</th></tr>
            </thead>
            <tbody>
              {work.map((w) => (
                <tr key={w.id} className="border-t border-gray-100">
                  <td className="py-2"><Link to={`/work/${w.id}/edit`} className="text-brand-600 hover:text-brand-700">{w.service_name}</Link></td>
                  <td className="py-2">{w.due_date || "—"}</td>
                  <td className="py-2">{w.staff_name || "—"}</td>
                  <td className="py-2"><StatusBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {vat.length > 0 && (
        <Section title="VAT Tracking">
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {vat.map((v) => (
              <div key={v.id} className={`p-2 rounded-lg text-center text-xs border ${v.status === "filed" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : v.status === "late" ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                <div className="font-medium">{v.month_name}</div>
                <div className="text-[10px] mt-0.5">{v.status === "filed" ? "✓ Filed" : "Pending"}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${tone === "danger" ? "text-red-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
function Section({ title, children, action }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
