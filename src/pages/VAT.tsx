import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";
import { NEPALI_MONTHS } from "@/lib/nepal-data";

export default function VAT() {
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [fiscalYear, setFiscalYear] = useState("2083/84");
  const [tab, setTab] = useState<"monthly" | "pending" | "filed">("monthly");

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const cs = await db.select<any[]>(
        `SELECT DISTINCT c.id, c.name FROM clients c
         WHERE c.category = 'regular' AND c.active = 1
         ORDER BY c.name`
      );
      setClients(cs);
      if (cs.length > 0) setSelected(cs[0].id);
    })();
  }, []);

  useEffect(() => {
    if (tab === "monthly" && selected) loadTracking();
    if (tab === "pending") loadByStatus(["pending", "late"]);
    if (tab === "filed") loadByStatus(["filed", "submitted"]);
  }, [selected, fiscalYear, tab]);

  async function loadTracking() {
    const db = await getDb();
    const existing = await db.select<any[]>(
      "SELECT * FROM vat_tracking WHERE client_id = ? AND fiscal_year = ? ORDER BY month_index",
      [selected, fiscalYear]
    );

    if (existing.length === 0) {
      for (let i = 0; i < 12; i++) {
        await db.execute(
          `INSERT OR IGNORE INTO vat_tracking
             (client_id, fiscal_year, month_index, month_name, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [selected, fiscalYear, i + 1, NEPALI_MONTHS[i]]
        );
      }
      setRows(await db.select<any[]>(
        "SELECT * FROM vat_tracking WHERE client_id = ? AND fiscal_year = ? ORDER BY month_index",
        [selected, fiscalYear]
      ));
    } else {
      setRows(existing);
    }
  }

  async function loadByStatus(statuses: string[]) {
    const db = await getDb();
    const ph = statuses.map(() => "?").join(",");
    setRows(await db.select<any[]>(
      `SELECT v.*, c.name as client_name, c.client_code FROM vat_tracking v
       JOIN clients c ON c.id = v.client_id WHERE v.status IN (${ph}) AND v.fiscal_year = ?
       ORDER BY v.month_index`, [...statuses, fiscalYear]
    ));
  }

  async function updateStatus(id: number, status: string) {
    const db = await getDb();
    await db.execute(
      `UPDATE vat_tracking SET status = ?, filed_date = CASE WHEN ?='filed' THEN date('now') ELSE filed_date END, updated_at = datetime('now') WHERE id = ?`,
      [status, status, id]
    );
    loadTracking();
  }

  const filedCount = rows.filter((r) => r.status === "filed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">VAT Return Tracking</h1>
          <p className="text-sm text-gray-500">Monthly VAT filing status</p>
        </div>
        <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option>2081/82</option>
          <option>2082/83</option>
          <option>2083/84</option>
          <option>2084/85</option>
        </select>
      </div>

      <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {(["monthly", "pending", "filed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${tab === t ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {t === "monthly" ? "Monthly Grid" : t === "pending" ? "Pending / Late" : "Filed"}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <>
          <select value={selected || ""} onChange={(e) => setSelected(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[300px]">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">FY: <strong>{fiscalYear}</strong></div>
              <div className="text-sm text-gray-600">Filed: <strong>{filedCount}</strong> / 12</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {rows.map((r) => (
                <div key={r.id} className={`border rounded-lg p-3 ${r.status === "filed" ? "bg-emerald-50 border-emerald-200" : r.status === "submitted" ? "bg-blue-50 border-blue-200" : r.status === "late" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900">{r.month_name}</span>
                    {r.status === "filed" && <span className="text-emerald-600 text-sm">✓</span>}
                  </div>
                  <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} className="w-full text-xs border border-gray-200 rounded px-1 py-1 bg-white">
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="filed">Filed</option>
                    <option value="late">Late</option>
                  </select>
                  {r.filed_date && <div className="text-[10px] text-gray-500 mt-1">Filed: {r.filed_date}</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {(tab === "pending" || tab === "filed") && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Filed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500">No {tab} VAT returns.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.client_code}</td>
                  <td className="px-4 py-3">{r.client_name}</td>
                  <td className="px-4 py-3">{r.month_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "late" ? "bg-red-100 text-red-800" : r.status === "filed" ? "bg-emerald-100 text-emerald-800" : r.status === "submitted" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.filed_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
