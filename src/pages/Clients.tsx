import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { hardDeleteClient } from "@/lib/delete";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "regular" | "one_time">("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, [filter]);

  async function load() {
    const db = await getDb();
    let q = `SELECT c.id, c.client_code, c.name, c.pan_no, c.category, c.contact_number,
             rt.name as registration_type, bc.name as business_category, d.name as district
      FROM clients c
      LEFT JOIN registration_types rt ON rt.id = c.registration_type_id
      LEFT JOIN business_categories bc ON bc.id = c.business_category_id
      LEFT JOIN districts d ON d.id = c.district_id
      WHERE c.active = 1`;
    const params: any[] = [];
    if (filter !== "all") { q += " AND c.category = ?"; params.push(filter); }
    q += " ORDER BY c.name ASC";
    setClients(await db.select<any[]>(q, params));
  }

  async function handleDelete(c: any) {
    const db = await getDb();
    const [stats] = await db.select<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM work_assignments WHERE client_id = ?) as work,
         (SELECT COUNT(*) FROM invoices WHERE client_id = ?) as invoices,
         (SELECT COUNT(*) FROM payments WHERE client_id = ?) as payments,
         (SELECT COUNT(*) FROM vat_tracking WHERE client_id = ?) as vat,
         (SELECT COUNT(*) FROM client_services WHERE client_id = ?) as services,
         (SELECT COUNT(*) FROM client_documents WHERE client_id = ?) as docs,
         (SELECT COUNT(*) FROM client_document_files WHERE client_id = ?) as files`,
      [c.id, c.id, c.id, c.id, c.id, c.id, c.id]
    );
    const total = (stats?.work || 0) + (stats?.invoices || 0) + (stats?.payments || 0) + (stats?.vat || 0) + (stats?.services || 0) + (stats?.docs || 0) + (stats?.files || 0);

    let message: string;
    if (total === 0) {
      message = `Delete "${c.name}" (${c.client_code})?`;
    } else {
      const lines: string[] = [];
      if (stats.work > 0) lines.push(`  • ${stats.work} work assignment(s)`);
      if (stats.invoices > 0) lines.push(`  • ${stats.invoices} invoice(s)`);
      if (stats.payments > 0) lines.push(`  • ${stats.payments} payment(s)`);
      if (stats.vat > 0) lines.push(`  • ${stats.vat} VAT row(s)`);
      if (stats.services > 0) lines.push(`  • ${stats.services} service(s)`);
      if (stats.docs > 0) lines.push(`  • ${stats.docs} document row(s)`);
      if (stats.files > 0) lines.push(`  • ${stats.files} file(s) on disk`);
      message = `This client has related data:\n\n` + lines.join("\n") + `\n\nDelete "${c.name}" and ALL this data permanently?\n\nThis cannot be undone.`;
    }

    setConfirmState({
      open: true,
      title: total === 0 ? "Delete Client" : "Delete Client and All Data",
      message,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        setDeleting(c.id);
        try {
          const result = await hardDeleteClient(c.id);
          if (!result.ok) { alert("Delete failed: " + result.message); return; }
          await logAudit("delete_client", "client", c.id, { name: c.name, stats: result.stats });
          load();
        } finally { setDeleting(null); }
      },
    });
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.pan_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.client_code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your firm's client portfolio</p>
        </div>
        <Link to="/clients/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Client
        </Link>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
          {(["all", "regular", "one_time"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 text-sm rounded-md font-medium",
                filter === f ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              )}>
              {f === "all" ? "All" : f === "regular" ? "Regular" : "One-Time"}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">PAN</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">District</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Category</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">No clients found.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{c.client_code}</td>
                <td className="px-4 py-3">
                  <Link to={`/clients/${c.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.pan_no || "—"}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.district || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                    c.category === "regular" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                  )}>
                    {c.category === "regular" ? "Regular" : "One-Time"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/clients/${c.id}/edit`} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">Edit</Link>
                  <button onClick={() => handleDelete(c)} disabled={deleting === c.id}
                    className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50">
                    <Trash2 size={12} /> {deleting === c.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Delete" danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </div>
  );
}
