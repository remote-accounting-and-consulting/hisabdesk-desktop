import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { getDb } from "@/lib/db";

export default function Topbar() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const [row] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM notifications WHERE read = 0"
      );
      setUnread(row?.c || 0);
    })();
  }, []);

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <div className="relative w-[28rem]">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search clients, work, invoices..."
          className="w-full pl-11 pr-4 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center gap-6">
        <div className="text-base text-gray-600">
          Fiscal Year:{" "}
          <span className="font-medium text-gray-900">2083/84</span>
        </div>
        <Link
          to="/notifications"
          className="relative p-2.5 rounded-lg hover:bg-gray-100"
        >
          <Bell size={22} className="text-gray-600" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
