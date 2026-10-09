import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { hardDeleteStaff } from "@/lib/delete";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();
    setStaff(await db.select<any[]>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM work_assignments
         WHERE assigned_staff_id = s.id AND status != 'completed') as active_work
       FROM staff s WHERE s.active = 1 ORDER BY s.name`));
  }

  async function handleDelete(s: any) {
    const db = await getDb();
    const [stats] = await db.select<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM work_assignments WHERE assigned_staff_id = ?) as work,
         (SELECT COUNT(*) FROM work_assignments WHERE supervisor_id = ?) as sup`,
      [s.id, s.id]);
    const total = (stats?.work || 0) + (stats?.sup || 0);

    let message: string;
    if (total === 0) {
      message = `Delete "${s.name}" (${s.staff_code})?`;
    } else {
      const lines: string[] = [];
      if (stats.work > 0) lines.push(`  • ${stats.work} work item(s) assigned`);
      if (stats.sup > 0) lines.push(`  • ${stats.sup} work item(s) supervised`);
      message = `This staff member has assigned work:\n\n` + lines.join("\n") + `\n\nDelete "${s.name}"?\n\nTheir work will be kept but unassigned.`;
    }

    setConfirmState({
      open: true,
      title: "Delete Staff",
      message,
      onConfirm: async () => {
        setConfirmState((cs) => ({ ...cs, open: false }));
        setDeleting(s.id);
        try {
          const result = await hardDeleteStaff(s.id);
          if (!result.ok) { alert("Delete failed: " + result.message); return; }
          await logAudit("delete_staff", "staff", s.id, { name: s.name, stats: result.stats });
          load();
        } finally { setDeleting(null); }
      },
    });
  }

  const max = Math.max(...staff.map((s) => s.active_work), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Staff</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Team members and workload</p>
        </div>
        <Link to="/staff/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Staff
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Position</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Active Work</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {staff.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">No staff yet.</td></tr>
            )}
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{s.staff_code}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.position || "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.contact || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${(s.active_work / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{s.active_work}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/staff/${s.id}/edit`} className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">
                    <Edit size={12} /> Edit
                  </Link>
                  <button onClick={() => handleDelete(s)} disabled={deleting === s.id}
                    className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50">
                    <Trash2 size={12} /> {deleting === s.id ? "Deleting..." : "Delete"}
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
