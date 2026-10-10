import { useEffect, useState } from "react";
import { Bell, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { getDb } from "@/lib/db";
import { Theme, getSavedTheme, saveTheme, applyTheme } from "@/lib/theme";
import { useNotifications } from "@/store/useNotifications";
import GlobalSearch from "./GlobalSearch";

export default function Topbar() {
  const [theme, setTheme] = useState<Theme>("dark");
  const { unread, refresh } = useNotifications();

  useEffect(() => {
    // Load theme
    getSavedTheme().then(setTheme);

    // Load notification count
    refresh();
  }, []);

  async function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    await saveTheme(next);
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 transition-colors">
      <GlobalSearch />

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Fiscal Year:{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            2083/84
          </span>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          {theme === "dark" ? (
            <Sun size={20} className="text-amber-400" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        <Link
          to="/notifications"
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
