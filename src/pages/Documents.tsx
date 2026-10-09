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
        (SELECT COUNT(*) FROM document_types WHERE active=1) as total_docs,
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Document collection status</p>
      </div>
      <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 w-fit">
        {(["all", "pending", "partial", "complete"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Progress</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Files</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">No clients match.</td></tr>}
            {filtered.map((c) => {
              const pct = c.total_docs ? Math.round((c.yes_count / c.total_docs) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{c.client_code}</td>
                  <td className="px-4 py-3 font-medium"><Link to={`/clients/${c.id}`} className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">{c.name}</Link></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{c.yes_count}/{c.total_docs}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{c.file_count > 0 ? `${c.file_count} attached` : "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {pct === 100 ? <span className="text-emerald-700 dark:text-emerald-400 font-medium">Complete</span> : pct >= 50 ? <span className="text-amber-700 dark:text-amber-400 font-medium">Partial</span> : <span className="text-red-700 dark:text-red-400 font-medium">Pending</span>}
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
