import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Briefcase, Wallet, AlertTriangle, CheckCircle2, Clock,
  FileText, Receipt, UserCog,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { getDb } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [priority, setPriority] = useState<any[]>([]);
  const [staffWork, setStaffWork] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const db = await getDb();

    const [clients] = await db.select<any[]>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN category='regular' THEN 1 ELSE 0 END) as regular,
              SUM(CASE WHEN category='one_time' THEN 1 ELSE 0 END) as one_time
       FROM clients WHERE active=1`
    );

    const [work] = await db.select<any[]>(
      `SELECT
         SUM(CASE WHEN status IN ('started','wip') THEN 1 ELSE 0 END) as wip,
         SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) as overdue,
         SUM(CASE WHEN status='due_today' THEN 1 ELSE 0 END) as due_today,
         SUM(CASE WHEN status='due_soon' THEN 1 ELSE 0 END) as due_soon,
         SUM(CASE WHEN status='completed' AND strftime('%Y-%m', completed_date) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) as completed_month
       FROM work_assignments`
    );

    const [fees] = await db.select<any[]>(
      `SELECT COALESCE(SUM(total_amount),0) as total,
              COALESCE(SUM(paid_amount),0) as paid,
              COALESCE(SUM(total_amount - paid_amount),0) as outstanding
       FROM invoices WHERE status != 'cancelled'`
    );

    const [collected] = await db.select<any[]>(
      `SELECT COALESCE(SUM(amount),0) as amount FROM payments
       WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')`
    );

    const [vatPending] = await db.select<any[]>(
      "SELECT COUNT(*) as c FROM vat_tracking WHERE status IN ('pending','late')"
    );

    setStats({
      totalClients: clients?.total || 0,
      regularClients: clients?.regular || 0,
      oneTimeClients: clients?.one_time || 0,
      workInProgress: work?.wip || 0,
      dueToday: work?.due_today || 0,
      dueSoon: work?.due_soon || 0,
      overdue: work?.overdue || 0,
      completedThisMonth: work?.completed_month || 0,
      totalReceivable: fees?.total || 0,
      collectedThisMonth: collected?.amount || 0,
      outstanding: fees?.outstanding || 0,
      vatPending: vatPending?.c || 0,
    });

    setPriority(await db.select<any[]>(
      `SELECT w.id, c.name as client_name, s.name as service_name, w.due_date, w.status, w.priority
       FROM work_assignments w
       JOIN clients c ON c.id = w.client_id
       JOIN services s ON s.id = w.service_id
       WHERE w.status NOT IN ('completed')
       ORDER BY CASE w.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, w.due_date ASC
       LIMIT 8`
    ));

    setStaffWork(await db.select<any[]>(
      `SELECT st.name, COUNT(w.id) as count FROM staff st
       LEFT JOIN work_assignments w ON w.assigned_staff_id = st.id AND w.status != 'completed'
       WHERE st.active = 1
       GROUP BY st.id ORDER BY count DESC LIMIT 6`
    ));
  }

  if (!stats) return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  const maxStaff = Math.max(...staffWork.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your firm's operations</p>
      </div>

      <div>
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Clients" value={stats.totalClients} icon={<Users size={18} />} tone="info" />
          <StatCard label="Regular Clients" value={stats.regularClients} icon={<Users size={18} />} tone="success" />
          <StatCard label="One-Time Clients" value={stats.oneTimeClients} icon={<Users size={18} />} />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard label="WIP" value={stats.workInProgress} icon={<Briefcase size={18} />} tone="info" />
          <StatCard label="Due Today" value={stats.dueToday} icon={<Clock size={18} />} tone="danger" />
          <StatCard label="Due Soon" value={stats.dueSoon} icon={<Clock size={18} />} tone="warning" />
          <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle size={18} />} tone="danger" />
          <StatCard label="Completed (Month)" value={stats.completedThisMonth} icon={<CheckCircle2 size={18} />} tone="success" />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Finance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Billed" value={formatCurrency(stats.totalReceivable)} icon={<Wallet size={18} />} tone="info" />
          <StatCard label="Collected (Month)" value={formatCurrency(stats.collectedThisMonth)} icon={<Wallet size={18} />} tone="success" />
          <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} icon={<AlertTriangle size={18} />} tone="danger" />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Pending</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/documents"><StatCard label="Documents" value="View" icon={<FileText size={18} />} tone="warning" /></Link>
          <Link to="/vat"><StatCard label="VAT Pending" value={stats.vatPending} icon={<Receipt size={18} />} tone="warning" /></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Today's Priority</h2>
            <Link to="/work" className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {priority.length === 0 && <div className="p-5 text-sm text-gray-500 dark:text-gray-400">No pending work.</div>}
            {priority.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${item.priority === "high" ? "bg-red-500" : item.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{item.client_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.service_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.due_date || "—"}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-colors">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UserCog size={16} /> Staff Workload
          </h2>
          {staffWork.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No staff.</p>}
          <div className="space-y-3">
            {staffWork.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{s.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{s.count}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${(s.count / maxStaff) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
