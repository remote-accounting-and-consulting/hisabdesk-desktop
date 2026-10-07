import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";

const COLUMNS = [
  { key: "not_started", label: "Not Started", color: "bg-gray-50" },
  { key: "started", label: "Started", color: "bg-blue-50" },
  { key: "wip", label: "WIP", color: "bg-blue-100" },
  { key: "due_today", label: "Due Today", color: "bg-orange-50" },
  { key: "due_soon", label: "Due Soon", color: "bg-amber-50" },
  { key: "overdue", label: "Overdue", color: "bg-red-50" },
  { key: "completed", label: "Completed", color: "bg-emerald-50" },
];

export default function Work() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();
    setTasks(await db.select<any[]>(
      `SELECT w.*, c.name as client_name, s.name as service_name, st.name as staff_name
       FROM work_assignments w JOIN clients c ON c.id = w.client_id
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
      [status, status, id]
    );
    await logAudit("update_work_status", "work", id, { status });
    load();
  }

  const filtered = tasks.filter((t) => {
    if (filter === "today") return t.status === "due_today";
    if (filter === "upcoming") return ["due_today", "due_soon", "started", "wip"].includes(t.status);
    if (filter === "overdue") return t.status === "overdue";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Services & Work</h1>
          <p className="text-sm text-gray-500">Kanban board</p>
        </div>
        <Link to="/work/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Work
        </Link>
      </div>
      <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {(["all", "today", "upcoming", "overdue", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === f ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {f === "all" ? "All Work" : f === "today" ? "Today's Work" : f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {COLUMNS.map((col) => {
          const items = filtered.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`${col.color} rounded-xl border border-gray-200 p-3 min-h-[300px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase">{col.label}</h3>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-3 text-xs">
                    <Link to={`/work/${t.id}/edit`} className="font-medium text-gray-900 truncate block hover:text-brand-600">{t.client_name}</Link>
                    <div className="text-gray-500 mt-0.5">{t.service_name}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">{t.due_date || "—"}</span>
                      {t.staff_name && <span className="text-[10px] text-gray-500">{t.staff_name}</span>}
                    </div>
                    <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} className="mt-2 w-full text-[10px] border border-gray-200 rounded px-1 py-0.5">
                      {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
