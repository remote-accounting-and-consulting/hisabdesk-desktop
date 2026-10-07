import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit } from "lucide-react";
import { getDb } from "@/lib/db";

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const db = await getDb();
      setStaff(await db.select<any[]>(
        `SELECT s.*, (SELECT COUNT(*) FROM work_assignments WHERE assigned_staff_id = s.id AND status != 'completed') as active_work
         FROM staff s WHERE s.active = 1 ORDER BY s.name`
      ));
    })();
  }, []);
  const max = Math.max(...staff.map((s) => s.active_work), 1);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500">Team members and workload</p>
        </div>
        <Link to="/staff/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Staff
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active Work</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-500">No staff yet. Add your first team member.</td></tr>}
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.staff_code}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.position || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{s.contact || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${(s.active_work / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{s.active_work}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/staff/${s.id}/edit`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <Edit size={12} /> Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
