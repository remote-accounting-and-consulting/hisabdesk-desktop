import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { hardDeleteWork } from "@/lib/delete";
import ConfirmDialog from "@/components/ConfirmDialog";

const COLUMNS = [
  { key: "not_started", label: "Not Started", color: "bg-gray-50 dark:bg-slate-800/50" },
  { key: "started", label: "Started", color: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "wip", label: "WIP", color: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "due_today", label: "Due Today", color: "bg-orange-50 dark:bg-orange-900/20" },
  { key: "due_soon", label: "Due Soon", color: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "overdue", label: "Overdue", color: "bg-red-50 dark:bg-red-900/20" },
  { key: "completed", label: "Completed", color: "bg-emerald-50 dark:bg-emerald-900/20" },
];

export default function Work() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();
    setTasks(await db.select<any[]>(
      `SELECT w.*, c.name as client_name, s.name as service_name, st.name as staff_name
       FROM work_assignments w
       JOIN clients c ON c.id = w.client_id
       JOIN services s ON s.id = w.service_id
       LEFT JOIN staff st ON st.id = w.assigned_staff_id
       ORDER BY w.due_date`
    ));
  }

  async function updateStatus(id: number, status: string) {
    const db = await getDb();
    await db.execute(
      `UPDATE work_assignments SET status=?, updated_at=datetime('now'),
       completed_date = CASE WHEN ?='completed' THEN date('now') ELSE completed_date END WHERE id=?`,
      [status, status, id]);
    await logAudit("update_work_status", "work", id, { status });
    load();
  }

  function handleDelete(t: any) {
    setConfirmState({
      open: true,
      title: "Delete Work Assignment",
      message: `Delete this work assignment?\n\nClient: ${t.client_name}\nService: ${t.service_name}\n\nThis cannot be undone.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const result = await hardDeleteWork(t.id);
        if (!result.ok) { alert("Delete failed: " + result.message); return; }
        await logAudit("delete_work", "work", t.id);
        load();
      },
    });
  }

  const filtered = tasks.filter((t) => {
    if (filter === "today") return t.status === "due_today";
    if (filter === "upcoming") return ["due_today", "due_soon", "started", "wip"].includes(t.status);
    if (filter === "overdue") return t.status === "overdue";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Services & Work</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kanban board</p>
        </div>
        <Link to="/work/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Work
        </Link>
      </div>
      <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 w-fit">
        {(["all", "today", "upcoming", "overdue", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
            {f === "all" ? "All Work" : f === "today" ? "Today's Work" : f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {COLUMNS.map((col) => {
          const items = filtered.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`${col.color} rounded-xl border border-gray-200 dark:border-slate-700 p-3 min-h-[300px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{col.label}</h3>
                <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-xs group">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/work/${t.id}/edit`} className="font-medium text-gray-900 dark:text-white truncate flex-1 hover:text-brand-600 dark:hover:text-brand-400">{t.client_name}</Link>
                      <button onClick={() => handleDelete(t)} title="Delete work"
                        className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-0.5">{t.service_name}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.due_date || "—"}</span>
                      {t.staff_name && <span className="text-[10px] text-gray-500 dark:text-gray-400">{t.staff_name}</span>}
                    </div>
                    <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}
                      className="mt-2 w-full text-[10px] border border-gray-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                      {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Delete" danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </div>
  );
}
