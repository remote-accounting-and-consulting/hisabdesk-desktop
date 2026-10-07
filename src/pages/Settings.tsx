import { useEffect, useState } from "react";
import { FolderOpen, Save, HardDrive, RefreshCcw, Download, Upload, Trash2 } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { getDb } from "@/lib/db";
import {
  getFilesRoot, setFilesRoot, getTotalFileCount, getTotalFileSize, formatBytes,
} from "@/lib/files";
import { rollForwardFiscalYear } from "@/lib/recurring";
import { deleteLookup } from "@/lib/delete";

export default function Settings() {
  const [tab, setTab] = useState<
    "storage" | "services" | "regtypes" | "bizcats" | "doctypes" | "fiscal" | "backup"
  >("storage");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage lookups and application settings
        </p>
      </div>

      <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-fit flex-wrap">
        {([
          ["storage", "Storage"],
          ["services", "Services"],
          ["regtypes", "Registration"],
          ["bizcats", "Business"],
          ["doctypes", "Documents"],
          ["fiscal", "Fiscal Year"],
          ["backup", "Backup"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              tab === k ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "storage" && <StorageSettings />}
      {tab === "services" && <ListEditor table="services" title="Services" />}
      {tab === "regtypes" && <ListEditor table="registration_types" title="Registration Types" />}
      {tab === "bizcats" && <ListEditor table="business_categories" title="Business Categories" />}
      {tab === "doctypes" && <ListEditor table="document_types" title="Document Types" />}
      {tab === "fiscal" && <FiscalYearSettings />}
      {tab === "backup" && <BackupSettings />}
    </div>
  );
}

function StorageSettings() {
  const [path, setPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [fc, setFc] = useState(0);
  const [fs, setFs] = useState(0);

  useEffect(() => {
    (async () => {
      setPath(await getFilesRoot());
      setFc(await getTotalFileCount());
      setFs(await getTotalFileSize());
    })();
  }, []);

  async function pick() {
    const p = await open({ directory: true, multiple: false });
    if (!p) return;
    const s: string =
      typeof p === "string"
        ? p
        : (p as any)?.path ?? String(p);
    if (typeof s === "string" && s) setPath(s);
  }

  async function reset() {
    const home = await homeDir();
    setPath(`${home.replace(/\/$/, "")}/HisabDesk-Files`);
  }

  async function onSave() {
    await setFilesRoot(path);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
          <HardDrive size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Document Storage</h2>
          <p className="text-xs text-gray-500">All uploaded files are saved here</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Folder Path</label>
        <div className="flex gap-2">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
          />
          <button
            onClick={pick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FolderOpen size={14} /> Browse
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={reset}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Reset to default
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          <Save size={14} /> {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div>
          <div className="text-xs text-gray-500">Files</div>
          <div className="text-lg font-semibold">{fc}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Size</div>
          <div className="text-lg font-semibold">{formatBytes(fs)}</div>
        </div>
      </div>
    </section>
  );
}

function ListEditor({ table, title }: { table: string; title: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const db = await getDb();
      // Some tables don't have sort_order; use a safe order by
      const hasSortOrder = ["registration_types", "business_categories", "document_types"].includes(table);
      const orderBy = hasSortOrder ? "active DESC, sort_order, name" : "active DESC, name";
      const rows = await db.select<any[]>(
        `SELECT * FROM ${table} ORDER BY ${orderBy}`
      );
      setItems(rows);
    } catch (e) {
      console.error(`Failed to load ${table}:`, e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!newName.trim()) return;
    try {
      const db = await getDb();
      await db.execute(`INSERT INTO ${table} (name) VALUES (?)`, [newName.trim()]);
      setNewName("");
      load();
    } catch (e) {
      alert("Add failed: " + e);
    }
  }

  async function toggle(id: number, active: number) {
    const db = await getDb();
    await db.execute(`UPDATE ${table} SET active = ? WHERE id = ?`, [
      active ? 0 : 1,
      id,
    ]);
    load();
  }

  async function handleDelete(it: any) {
    if (!confirm(`Delete "${it.name}"?\n\nThis cannot be undone.`)) return;
    const result = await deleteLookup(table, it.id);
    if (!result.ok) {
      alert(result.message);
      return;
    }
    load();
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">{title}</h2>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`Add new ${title.toLowerCase()}`}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
        />
        <button
          onClick={add}
          className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          Add
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          Error loading {title}: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="divide-y divide-gray-100">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">
              No items. Add one above.
            </p>
          )}
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2">
              <span
                className={`text-sm ${
                  it.active ? "text-gray-900" : "text-gray-400 line-through"
                }`}
              >
                {it.name}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(it.id, it.active)}
                  className={`text-xs font-medium ${
                    it.active
                      ? "text-gray-600 hover:text-gray-800"
                      : "text-emerald-600 hover:text-emerald-700"
                  }`}
                >
                  {it.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleDelete(it)}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FiscalYearSettings() {
  const [current, setCurrent] = useState("");
  const [newFY, setNewFY] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const [row] = await db.select<any[]>(
        "SELECT value FROM settings WHERE key='fiscal_year'"
      );
      setCurrent(row?.value || "2083/84");
    })();
  }, []);

  async function roll() {
    if (!newFY.trim()) return;
    if (!confirm(`Roll forward to ${newFY}?`)) return;
    const count = await rollForwardFiscalYear(newFY.trim());
    setCurrent(newFY.trim());
    setNewFY("");
    setStatus(`Rolled forward. Recurring work regenerated for ${count} regular clients.`);
    setTimeout(() => setStatus(null), 4000);
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
          <RefreshCcw size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Fiscal Year</h2>
          <p className="text-xs text-gray-500">Shrawan → Ashadh roll-forward</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Current</label>
          <div className="text-lg font-semibold">{current}</div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">New FY</label>
          <input
            value={newFY}
            onChange={(e) => setNewFY(e.target.value)}
            placeholder="2084/85"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <button
        onClick={roll}
        disabled={!newFY.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
      >
        <RefreshCcw size={14} /> Roll Forward
      </button>

      {status && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          {status}
        </div>
      )}
    </section>
  );
}

function BackupSettings() {
  const [status, setStatus] = useState<string | null>(null);

  async function exportDb() {
    try {
      const db = await getDb();
      const tables = [
        "clients", "staff", "services", "client_services",
        "work_assignments", "vat_tracking", "invoices", "payments",
        "client_documents", "client_document_files",
        "registration_types", "business_categories", "document_types", "settings",
      ];
      const backup: any = { exported_at: new Date().toISOString(), data: {} };
      for (const t of tables) backup.data[t] = await db.select<any[]>(`SELECT * FROM ${t}`);

      const target = await save({
        defaultPath: `hisabdesk-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!target) return;
      await writeTextFile(target, JSON.stringify(backup, null, 2));
      setStatus(`Saved: ${target}`);
    } catch (e) {
      setStatus("Backup failed: " + e);
    }
  }

  async function importDb() {
    if (!confirm("Importing will OVERWRITE existing data. Continue?")) return;
    try {
      const source = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!source) return;
      const path: string =
        typeof source === "string"
          ? source
          : (source as any)?.path ?? String(source);
      if (!path) return;
      const content = await readTextFile(path);
      const backup = JSON.parse(content);
      const db = await getDb();
      for (const t of Object.keys(backup.data || {})) {
        await db.execute(`DELETE FROM ${t}`);
        for (const row of backup.data[t]) {
          const cols = Object.keys(row);
          const ph = cols.map(() => "?").join(",");
          await db.execute(
            `INSERT INTO ${t} (${cols.join(",")}) VALUES (${ph})`,
            cols.map((c) => row[c])
          );
        }
      }
      setStatus("Restored.");
    } catch (e) {
      setStatus("Restore failed: " + e);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Backup & Restore</h2>
      <p className="text-xs text-gray-500">
        Export all tables to JSON. Back up the files folder separately.
      </p>
      <div className="flex gap-2">
        <button
          onClick={exportDb}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          <Download size={14} /> Export
        </button>
        <button
          onClick={importDb}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <Upload size={14} /> Import
        </button>
      </div>
      {status && (
        <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700">
          {status}
        </div>
      )}
    </section>
  );
}
