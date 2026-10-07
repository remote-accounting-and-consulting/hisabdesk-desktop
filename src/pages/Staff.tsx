import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { getDb, logAudit } from "@/lib/db";
import { deleteStaff } from "@/lib/delete";

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const db = await getDb();
    setStaff(
      await db.select<any[]>(
        `SELECT s.*,
          (SELECT COUNT(*) FROM work_assignments
           WHERE assigned_staff_id = s.id AND status != 'completed') as active_work
         FROM staff s
         ORDER BY s.active DESC, s.name`
      )
    );
  }

  async function handleDelete(s: any) {
    if (
      !confirm(
        `Delete "${s.name}" (${s.staff_code})?\n\nThis cannot be undone.`
      )
    )
      return;

    let force = false;
    let result = await deleteStaff(s.id, false);

    // If it fails because of dependencies, offer force delete
    if (!result.ok && result.message.includes("assigned")) {
      force = confirm(
        result.message + "\n\nForce delete anyway?\n" +
        "(Historical records will lose the staff link)"
      );
      if (!force) return;
      result = await deleteStaff(s.id, true);
    }

    if (!result.ok) {
      alert(result.message);
      return;
    }

    await logAudit("delete_staff", "staff", s.id, { name: s.name });
    load();
  }

  async function toggleActive(s: any) {
    const db = await getDb();
    await db.execute("UPDATE staff SET active = ? WHERE id = ?", [
      s.active ? 0 : 1,
      s.id,
    ]);
    load();
  }

  const max = Math.max(...staff.map((s) => s.active_work), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500">
            Team members and workload
          </p>
        </div>
        <Link
          to="/staff/new"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active Work</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  No staff yet.
                </td>
              </tr>
            )}
            {staff.map((s) => (
              <tr
                key={s.id}
                className={`hover:bg-gray-50 ${!s.active ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {s.staff_code}
                </td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {s.position || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${(s.active_work / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {s.active_work}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link
                    to={`/staff/${s.id}/edit`}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Edit size={12} /> Edit
                  </Link>
                  <button
                    onClick={() => toggleActive(s)}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    {s.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
