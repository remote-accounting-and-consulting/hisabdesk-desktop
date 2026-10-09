import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Briefcase,
  Receipt,
  UserCog,
  X,
} from "lucide-react";
import { getDb } from "@/lib/db";

interface Result {
  type: "client" | "work" | "invoice" | "staff";
  id: number;
  title: string;
  subtitle: string;
  link: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const db = await getDb();
        const q = `%${query.trim()}%`;
        const found: Result[] = [];

        const clients = await db.select<any[]>(
          `SELECT id, name, client_code, pan_no FROM clients
           WHERE active = 1 AND (name LIKE ? OR client_code LIKE ? OR pan_no LIKE ?)
           LIMIT 5`,
          [q, q, q]
        );
        for (const c of clients) {
          found.push({
            type: "client", id: c.id, title: c.name,
            subtitle: `${c.client_code}${c.pan_no ? " · PAN " + c.pan_no : ""}`,
            link: `/clients/${c.id}`,
          });
        }

        const work = await db.select<any[]>(
          `SELECT w.id, w.title, w.due_date, c.name as client_name, s.name as service_name
           FROM work_assignments w
           JOIN clients c ON c.id = w.client_id
           JOIN services s ON s.id = w.service_id
           WHERE w.title LIKE ? OR c.name LIKE ? OR s.name LIKE ?
           ORDER BY w.due_date DESC LIMIT 5`,
          [q, q, q]
        );
        for (const w of work) {
          found.push({
            type: "work", id: w.id, title: w.title || w.service_name,
            subtitle: `${w.client_name}${w.due_date ? " · " + w.due_date : ""}`,
            link: `/work/${w.id}/edit`,
          });
        }

        const invoices = await db.select<any[]>(
          `SELECT i.id, i.invoice_no, i.total_amount, c.name as client_name
           FROM invoices i JOIN clients c ON c.id = i.client_id
           WHERE i.invoice_no LIKE ? OR c.name LIKE ?
           ORDER BY i.invoice_date DESC LIMIT 5`,
          [q, q]
        );
        for (const inv of invoices) {
          found.push({
            type: "invoice", id: inv.id, title: inv.invoice_no,
            subtitle: `${inv.client_name} · Rs. ${inv.total_amount.toLocaleString("en-IN")}`,
            link: `/fees/invoices/${inv.id}/edit`,
          });
        }

        const staff = await db.select<any[]>(
          `SELECT id, name, staff_code, position FROM staff
           WHERE active = 1 AND (name LIKE ? OR staff_code LIKE ?) LIMIT 5`,
          [q, q]
        );
        for (const s of staff) {
          found.push({
            type: "staff", id: s.id, title: s.name,
            subtitle: `${s.staff_code}${s.position ? " · " + s.position : ""}`,
            link: `/staff/${s.id}/edit`,
          });
        }

        setResults(found);
        setOpen(true);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  function go(r: Result) {
    navigate(r.link);
    setOpen(false);
    setQuery("");
  }

  const iconFor = (type: Result["type"]) => {
    const cls = "text-gray-400 dark:text-gray-500 flex-shrink-0";
    if (type === "client") return <Users size={16} className={cls} />;
    if (type === "work") return <Briefcase size={16} className={cls} />;
    if (type === "invoice") return <Receipt size={16} className={cls} />;
    return <UserCog size={16} className={cls} />;
  };

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-[28rem]">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => query && setOpen(true)}
        placeholder="Search clients, work, invoices... (Ctrl+K)"
        className="w-full pl-11 pr-10 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <X size={14} className="text-gray-400 dark:text-gray-500" />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              No results for "{query}"
            </div>
          )}
          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => go(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                  i === activeIndex
                    ? "bg-brand-50 dark:bg-brand-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                }`}
              >
                {iconFor(r.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {r.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {r.subtitle}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {r.type}
                </span>
              </button>
            ))}
          {!loading && results.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 text-[10px] text-gray-400 dark:text-gray-500 flex justify-between">
              <span>↑↓ navigate · Enter open · Esc close</span>
              <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
