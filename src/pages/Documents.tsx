import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDb } from "@/lib/db";

export default function Documents() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "partial" | "complete">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();
    setRows(await db.select<any[]>(
      `SELECT c.id, c.name, c.client_code,
        (SELECT COUNT(*) FROM client_documents WHERE client_id = c.id AND status='yes') as yes_count,
        (SELECT COUNT(*) FROM client_documents WHERE client_id = c.id AND status='partial') as partial_count,
        (SELECT COUNT(*) FROM document_types) as total_docs,
        (SELECT COUNT(*) FROM client_document_files WHERE client_id = c.id) as file_count
       FROM clients c WHERE c.active = 1 ORDER BY c.name`
    ));
  }

  const filtered = rows.filter((r) => {
    const pct = r.total_docs ? (r.yes_count / r.total_docs) * 100 : 0;
    if (filter === "complete") return pct === 100;
    if (filter === "partial") return pct >= 50 && pct < 100;
    if (filter === "pending") return pct < 50;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500">Document collection status</p>
      </div>
      <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {(["all", "pending", "partial", "complete"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-md font-medium ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Progress</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Files</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500">No clients match.</td></tr>}
            {filtered.map((c) => {
              const pct = c.total_docs ? Math.round((c.yes_count / c.total_docs) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.client_code}</td>
                  <td className="px-4 py-3 font-medium"><Link to={`/clients/${c.id}`} className="text-brand-600 hover:text-brand-700">{c.name}</Link></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{c.yes_count}/{c.total_docs}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.file_count > 0 ? `${c.file_count} attached` : "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {pct === 100 ? <span className="text-emerald-700 font-medium">Complete</span> : pct >= 50 ? <span className="text-amber-700 font-medium">Partial</span> : <span className="text-red-700 font-medium">Pending</span>}
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
