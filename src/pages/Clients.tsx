import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "regular" | "one_time">("all");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [filter]);

  async function load() {
    const db = await getDb();
    let q = `SELECT c.id, c.client_code, c.name, c.pan_no, c.category, c.contact_number, rt.name as registration_type, bc.name as business_category, d.name as district FROM clients c LEFT JOIN registration_types rt ON rt.id = c.registration_type_id LEFT JOIN business_categories bc ON bc.id = c.business_category_id LEFT JOIN districts d ON d.id = c.district_id WHERE c.active = 1`;
    const params: any[] = [];
    if (filter !== "all") { q += " AND c.category = ?"; params.push(filter); }
    q += " ORDER BY c.name ASC";
    setClients(await db.select<any[]>(q, params));
  }

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.pan_no || "").toLowerCase().includes(search.toLowerCase()) || (c.client_code || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">Manage your firm's client portfolio</p>
        </div>
        <Link to="/clients/new" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Client
        </Link>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-white border border-gray-200 rounded-lg p-1">
          {(["all", "regular", "one_time"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 text-sm rounded-md font-medium", filter === f ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
              {f === "all" ? "All" : f === "regular" ? "Regular" : "One-Time"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">PAN</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">District</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-500">No clients.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.client_code}</td>
                <td className="px-4 py-3"><Link to={`/clients/${c.id}`} className="font-medium text-brand-600 hover:text-brand-700">{c.name}</Link></td>
                <td className="px-4 py-3 text-gray-700">{c.pan_no || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{c.registration_type || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{c.district || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", c.category === "regular" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700")}>
                    {c.category === "regular" ? "Regular" : "One-Time"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
