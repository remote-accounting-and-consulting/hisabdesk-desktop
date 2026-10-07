import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";
import { generateRecurringWork } from "@/lib/recurring";

export default function ClientServices() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<number, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const db = await getDb();
    const all = await db.select<any[]>("SELECT id, name, default_fee FROM services WHERE active=1 ORDER BY name");
    const assigned = await db.select<any[]>("SELECT service_id, estimated_fee, tax_amount FROM client_services WHERE client_id=?", [id]);
    const state: any = {};
    for (const s of all) {
      const a = assigned.find((x) => x.service_id === s.id);
      state[s.id] = { checked: !!a, fee: a ? String(a.estimated_fee) : String(s.default_fee || 0), tax: a ? String(a.tax_amount) : "0" };
    }
    setServices(all);
    setSelected(state);
  }

  async function save() {
    setSaving(true);
    try {
      const db = await getDb();
      await db.execute("DELETE FROM client_services WHERE client_id=?", [id]);
      for (const svc of services) {
        const s = selected[svc.id];
        if (s?.checked) {
          await db.execute(
            "INSERT INTO client_services (client_id, service_id, estimated_fee, tax_amount) VALUES (?, ?, ?, ?)",
            [id, svc.id, Number(s.fee) || 0, Number(s.tax) || 0]
          );
        }
      }
      await logAudit("update_client_services", "client", Number(id));
      await generateRecurringWork(Number(id));
      navigate(`/clients/${id}`);
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Manage Services</h1>
        <p className="text-sm text-gray-500">Select services for this client and set fees</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {services.map((s) => {
          const state = selected[s.id] || { checked: false, fee: "0", tax: "0" };
          return (
            <div key={s.id} className="p-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={state.checked} onChange={(e) => setSelected({ ...selected, [s.id]: { ...state, checked: e.target.checked } })} />
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
              </label>
              {state.checked && (
                <div className="grid grid-cols-2 gap-3 mt-3 ml-7">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Estimated Fee (Rs.)</label>
                    <input type="number" value={state.fee} onChange={(e) => setSelected({ ...selected, [s.id]: { ...state, fee: e.target.value } })} className="input" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tax Amount (Rs.)</label>
                    <input type="number" value={state.tax} onChange={(e) => setSelected({ ...selected, [s.id]: { ...state, tax: e.target.value } })} className="input" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : "Save Services"}</button>
      </div>
    </div>
  );
}
