import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, Clock, CalendarClock, CalendarDays, CalendarRange, Receipt,
} from "lucide-react";
import { getDb } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";

export default function Deadlines() {
  const [groups, setGroups] = useState<any>({});
  const [vat, setVat] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const rows = await db.select<any[]>(
        `SELECT w.*, c.name as client_name, s.name as service_name FROM work_assignments w
         JOIN clients c ON c.id = w.client_id JOIN services s ON s.id = w.service_id
         WHERE w.status NOT IN ('completed') AND w.due_date IS NOT NULL ORDER BY w.due_date ASC`);
      const buckets: any = { overdue: [], today: [], tomorrow: [], thisWeek: [], thisMonth: [], later: [] };
      const t = new Date(); t.setHours(0, 0, 0, 0);
      for (const r of rows) {
        const d = new Date(r.due_date); d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) buckets.overdue.push(r);
        else if (diff === 0) buckets.today.push(r);
        else if (diff === 1) buckets.tomorrow.push(r);
        else if (diff <= 7) buckets.thisWeek.push(r);
        else if (diff <= 30) buckets.thisMonth.push(r);
        else buckets.later.push(r);
      }
      setGroups(buckets);
      setVat(await db.select<any[]>(
        `SELECT v.*, c.name as client_name FROM vat_tracking v
         JOIN clients c ON c.id = v.client_id WHERE v.status IN ('pending', 'late') ORDER BY v.month_index`));
    })();
  }, []);

  const sections = [
    { key: "overdue", label: "Overdue", tone: "text-red-700 dark:text-red-400", icon: AlertCircle },
    { key: "today", label: "Due Today", tone: "text-orange-700 dark:text-orange-400", icon: Clock },
    { key: "tomorrow", label: "Due Tomorrow", tone: "text-amber-700 dark:text-amber-400", icon: Clock },
    { key: "thisWeek", label: "Due This Week", tone: "text-blue-700 dark:text-blue-400", icon: CalendarClock },
    { key: "thisMonth", label: "Due This Month", tone: "text-purple-700 dark:text-purple-400", icon: CalendarDays },
    { key: "later", label: "Later", tone: "text-gray-700 dark:text-gray-300", icon: CalendarRange },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Deadlines</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming work and VAT deadlines</p>
      </div>
      {sections.map((sec) => {
        const items = groups[sec.key] || [];
        if (items.length === 0) return null;
        const Icon = sec.icon;
        return (
          <div key={sec.key} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className={`font-semibold ${sec.tone} flex items-center gap-2`}><Icon size={18} />{sec.label}</h2>
              <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {items.map((w: any) => (
                <Link key={w.id} to={`/work/${w.id}/edit`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{w.client_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{w.service_name}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{w.due_date}</span>
                    <StatusBadge status={w.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {vat.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Receipt size={18} /> VAT Returns Pending / Late
            </h2>
            <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{vat.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
            {vat.map((v) => (
              <Link key={v.id} to="/vat" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{v.client_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{v.month_name} — {v.fiscal_year}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.status === "late" ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"}`}>
                  {v.status.toUpperCase()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
