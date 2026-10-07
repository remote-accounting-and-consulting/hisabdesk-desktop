import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getDb } from "@/lib/db";

export default function Notifications() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { load(); }, []);
  async function load() {
    const db = await getDb();
    setRows(await db.select<any[]>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100"));
  }
  async function markAllRead() {
    const db = await getDb();
    await db.execute("UPDATE notifications SET read = 1 WHERE read = 0");
    load();
  }
  async function markRead(id: number) {
    const db = await getDb();
    await db.execute("UPDATE notifications SET read = 1 WHERE id = ?", [id]);
    load();
  }
  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    const db = await getDb();
    await db.execute("DELETE FROM notifications");
    load();
  }
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">System alerts and reminders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">
            <CheckCheck size={14} /> Mark all read
          </button>
          <button onClick={clearAll} className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium">
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {rows.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-3 text-gray-300" />
            No notifications yet.
          </div>
        )}
        {rows.map((n) => (
          <div key={n.id} className={`p-4 flex items-start gap-3 ${n.read ? "" : "bg-blue-50/50"}`}>
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.type === "danger" ? "bg-red-500" : n.type === "warning" ? "bg-amber-500" : n.type === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className={`font-medium text-sm ${n.read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</div>
                <div className="text-xs text-gray-400 flex-shrink-0">{n.created_at?.slice(0, 16)}</div>
              </div>
              {n.message && <div className="text-sm text-gray-600 mt-1">{n.message}</div>}
              <div className="flex items-center gap-3 mt-2">
                {n.link && <Link to={n.link} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Open →</Link>}
                {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-gray-500 hover:text-gray-700">Mark as read</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
