import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb, logAudit } from "@/lib/db";
import { getProvinces, getDistricts, getLocalLevels } from "@/lib/nepal-data";
import { generateRecurringWork } from "@/lib/recurring";

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [localLevels, setLocalLevels] = useState<any[]>([]);
  const [regTypes, setRegTypes] = useState<any[]>([]);
  const [bizCats, setBizCats] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", pan_no: "", registration_type_id: "", business_category_id: "",
    category: "one_time", registration_date: new Date().toISOString().slice(0, 10),
    authorised_person: "", contact_number: "", email: "",
    province_id: "", district_id: "", local_level_id: "", ward_no: "",
    address_line: "", remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setProvinces(await getProvinces());
      const db = await getDb();
      setRegTypes(await db.select<any[]>("SELECT id, name FROM registration_types WHERE active=1 ORDER BY sort_order"));
      setBizCats(await db.select<any[]>("SELECT id, name FROM business_categories WHERE active=1 ORDER BY sort_order"));
      if (isEdit) {
        const [c] = await db.select<any[]>("SELECT * FROM clients WHERE id=?", [id]);
        if (c) {
          setForm({
            name: c.name || "", pan_no: c.pan_no || "",
            registration_type_id: String(c.registration_type_id || ""),
            business_category_id: String(c.business_category_id || ""),
            category: c.category || "one_time",
            registration_date: c.registration_date || "",
            authorised_person: c.authorised_person || "",
            contact_number: c.contact_number || "",
            email: c.email || "",
            province_id: String(c.province_id || ""),
            district_id: String(c.district_id || ""),
            local_level_id: String(c.local_level_id || ""),
            ward_no: String(c.ward_no || ""),
            address_line: c.address_line || "",
            remarks: c.remarks || "",
          });
          if (c.province_id) setDistricts(await getDistricts(c.province_id));
          if (c.district_id) setLocalLevels(await getLocalLevels(c.district_id));
        }
      }
    })();
  }, [id]);

  async function handleProvince(v: string) {
    setForm({ ...form, province_id: v, district_id: "", local_level_id: "", ward_no: "" });
    setDistricts([]); setLocalLevels([]);
    if (v) setDistricts(await getDistricts(Number(v)));
  }
  async function handleDistrict(v: string) {
    setForm({ ...form, district_id: v, local_level_id: "", ward_no: "" });
    setLocalLevels([]);
    if (v) setLocalLevels(await getLocalLevels(Number(v)));
  }
  async function handleLocalLevel(v: string) {
    setForm({ ...form, local_level_id: v, ward_no: "" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const db = await getDb();
      const payload = {
        name: form.name,
        pan_no: form.pan_no || null,
        registration_type_id: form.registration_type_id ? Number(form.registration_type_id) : null,
        business_category_id: form.business_category_id ? Number(form.business_category_id) : null,
        category: form.category,
        registration_date: form.registration_date || null,
        authorised_person: form.authorised_person || null,
        contact_number: form.contact_number || null,
        email: form.email || null,
        province_id: form.province_id ? Number(form.province_id) : null,
        district_id: form.district_id ? Number(form.district_id) : null,
        local_level_id: form.local_level_id ? Number(form.local_level_id) : null,
        ward_no: form.ward_no ? Number(form.ward_no) : null,
        address_line: form.address_line || null,
        remarks: form.remarks || null,
      };

      if (isEdit) {
        await db.execute(
          `UPDATE clients SET name=?, pan_no=?, registration_type_id=?, business_category_id=?, category=?, registration_date=?, authorised_person=?, contact_number=?, email=?, province_id=?, district_id=?, local_level_id=?, ward_no=?, address_line=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
          [...Object.values(payload), id]
        );
        await logAudit("update_client", "client", Number(id), { name: form.name });
        if (form.category === "regular") await generateRecurringWork(Number(id));
        navigate(`/clients/${id}`);
      } else {
        const [lastRow] = await db.select<any[]>("SELECT client_code FROM clients ORDER BY id DESC LIMIT 1");
        let next = 1;
        if (lastRow?.client_code) {
          const m = String(lastRow.client_code).match(/(\d+)$/);
          if (m) next = parseInt(m[1], 10) + 1;
        }
        const code = `CL${String(next).padStart(4, "0")}`;
        const result = await db.execute(
          `INSERT INTO clients (client_code, name, pan_no, registration_type_id, business_category_id, category, registration_date, authorised_person, contact_number, email, province_id, district_id, local_level_id, ward_no, address_line, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [code, ...Object.values(payload)]
        );
        const newId = Number((result as any).lastInsertId);
        await logAudit("create_client", "client", newId, { name: form.name, code });
        if (form.category === "regular") await generateRecurringWork(newId);
        navigate("/clients");
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {isEdit ? "Edit Client" : "New Client Registration"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Register a client with complete details</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Client Name *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
            <Field label="PAN No."><input value={form.pan_no} onChange={(e) => setForm({ ...form, pan_no: e.target.value })} className="input" /></Field>
            <Field label="Registration Type">
              <select value={form.registration_type_id} onChange={(e) => setForm({ ...form, registration_type_id: e.target.value })} className="input">
                <option value="">— Select —</option>
                {regTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Nature of Business">
              <select value={form.business_category_id} onChange={(e) => setForm({ ...form, business_category_id: e.target.value })} className="input">
                <option value="">— Select —</option>
                {bizCats.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Category *">
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <input type="radio" value="one_time" checked={form.category === "one_time"} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <span className="text-sm">One-Time</span>
                </label>
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <input type="radio" value="regular" checked={form.category === "regular"} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <span className="text-sm">Regular</span>
                </label>
              </div>
            </Field>
            <Field label="Registration Date"><input type="date" value={form.registration_date} onChange={(e) => setForm({ ...form, registration_date: e.target.value })} className="input" /></Field>
            <Field label="Authorised Person"><input value={form.authorised_person} onChange={(e) => setForm({ ...form, authorised_person: e.target.value })} className="input" /></Field>
            <Field label="Contact Number"><input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} className="input" /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Province">
              <select value={form.province_id} onChange={(e) => handleProvince(e.target.value)} className="input">
                <option value="">— Select —</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="District">
              <select value={form.district_id} onChange={(e) => handleDistrict(e.target.value)} className="input" disabled={!form.province_id}>
                <option value="">— Select —</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Local Level">
              <select value={form.local_level_id} onChange={(e) => handleLocalLevel(e.target.value)} className="input" disabled={!form.district_id}>
                <option value="">— Select —</option>
                {localLevels.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
              </select>
            </Field>
            <Field label="Ward No.">
              <input
                type="number"
                min="1"
                max="35"
                value={form.ward_no}
                onChange={(e) => setForm({ ...form, ward_no: e.target.value })}
                placeholder="e.g. 7"
                className="input"
              />
            </Field>
            <Field label="Address Line" full>
              <input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} placeholder="Street, Tole" className="input" />
            </Field>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <Field label="Remarks"><textarea rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input" /></Field>
        </section>

        {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : isEdit ? "Update" : "Register"}</button>
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
