import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Receipt,
  Wallet,
  UserCog,
  BarChart3,
  Settings,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/work", label: "Services & Work", icon: Briefcase },
  { to: "/vat", label: "VAT Tracking", icon: Receipt },
  { to: "/fees", label: "Fees & Payments", icon: Wallet },
  { to: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { to: "/staff", label: "Staff", icon: UserCog },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col transition-colors">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-slate-700">
        <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl">
          H
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
            HisabDesk
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
            Accounting & Consulting
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-base font-medium transition",
                isActive
                  ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              )
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 px-3">
          © 2082 Remote Accounting and Consulting Pvt. Ltd.
        </div>
      </div>
    </aside>
  );
}
