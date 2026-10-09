import { useEffect, useState } from "react";
import {
  FolderOpen, Save, HardDrive, RefreshCcw, Download, Upload, Trash2,
  Package, Info, Database, FileText,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  exists, mkdir, copyFile, readDir, readTextFile, writeTextFile, stat,
} from "@tauri-apps/plugin-fs";
import { appDataDir, appConfigDir } from "@tauri-apps/api/path";
import { getDb } from "@/lib/db";
import {
  getFilesRoot, setFilesRoot, getTotalFileCount, getTotalFileSize, formatBytes,
} from "@/lib/files";
import { rollForwardFiscalYear } from "@/lib/recurring";
import { hardDeleteLookup } from "@/lib/delete";
import ConfirmDialog from "@/components/ConfirmDialog";
import AboutTab from "@/components/settings/AboutTab";
import UpdateTab from "@/components/settings/UpdateTab";
import Toast, { ToastType } from "@/components/Toast";

type Tab =
  | "storage"
  | "backup"
  | "fiscal"
  | "services"
  | "regtypes"
  | "bizcats"
  | "doctypes"
  | "about"
  | "update";

export default function Settings() {
  const [tab, setTab] = useState<Tab>("storage");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Storage info, backup & restore, and lookups</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
          {([["storage", "Storage"], ["backup", "Backup & Restore"], ["fiscal", "Fiscal Year"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${tab === k ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
          {([["services", "Services"], ["regtypes", "Registration"], ["bizcats", "Business"], ["doctypes", "Documents"], ["about", "About"], ["update", "Update"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${tab === k ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "storage" && <StorageInfo />}
      {tab === "backup" && <BackupRestore />}
      {tab === "fiscal" && <FiscalYearSettings />}
      {tab === "services" && <ListEditor table="services" title="Services" />}
      {tab === "regtypes" && <ListEditor table="registration_types" title="Registration Types" />}
      {tab === "bizcats" && <ListEditor table="business_categories" title="Business Categories" />}
      {tab === "doctypes" && <ListEditor table="document_types" title="Document Types" />}
      {tab === "about" && <AboutTab />}
      {tab === "update" && <UpdateTab />}
    </div>
  );
}

function StorageInfo() {
  const [filesPath, setFilesPath] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [dbPath, setDbPath] = useState("");
  const [dbSize, setDbSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fp = await getFilesRoot();
        setFilesPath(fp);
        setFileCount(await getTotalFileCount());
        setFileSize(await getTotalFileSize());

        let path = "";
        try {
          const configDir = await appConfigDir();
          const p = `${configDir}/hisabdesk.db`.replace(/\/+/g, "/");
          if (await exists(p)) path = p;
        } catch {}
        if (!path) {
          const dataDir = await appDataDir();
          const p = `${dataDir}/hisabdesk.db`.replace(/\/+/g, "/");
          if (await exists(p)) path = p;
        }
        setDbPath(path || "(location unknown)");
        if (path) {
          try {
            const info = await stat(path);
            setDbSize(info.size ?? 0);
          } catch {}
        }
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <StorageCard
        icon={<FileText size={20} />}
        title="Documents"
        subtitle="Uploaded PDFs, images, and other files"
        path={filesPath}
        stats={[{ label: "Files", value: String(fileCount) }, { label: "Size", value: formatBytes(fileSize) }]}
      />
      <StorageCard
        icon={<Database size={20} />}
        title="Database"
        subtitle="All records — clients, work, invoices, payments"
        path={dbPath}
        stats={[{ label: "Size", value: formatBytes(dbSize) }, { label: "Type", value: "SQLite" }]}
      />
    </div>
  );
}

function StorageCard({ icon, title, subtitle, path, stats }: any) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">{icon}</div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
        <code className="block bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{path}</code>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-slate-700">
        {stats.map((s: any) => (
          <div key={s.label}>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BackupRestore() {
  const [busy, setBusy] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [toast, setToast] = useState<{ open: boolean; type: ToastType; title: string; message?: string }>(
    { open: false, type: "success", title: "" });
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", confirmLabel: "Confirm", onConfirm: () => {} });

  useEffect(() => {
    (async () => {
      setFileCount(await getTotalFileCount());
      setFileSize(await getTotalFileSize());
    })();
  }, []);

  function showToast(type: ToastType, title: string, message?: string) {
    setToast({ open: true, type, title, message });
  }

  async function backupBoth() {
    setBusy(true);
    try {
      const targetDir = await open({ directory: true, multiple: false });
      if (!targetDir) { setBusy(false); return; }
      const targetPath = typeof targetDir === "string" ? targetDir : (targetDir as any)?.path ?? String(targetDir);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const backupFolder = `${targetPath}/hisabdesk-backup-${stamp}`;

      if (!(await exists(backupFolder))) await mkdir(backupFolder, { recursive: true });
      const json = await buildBackupJson();
      await writeTextFile(`${backupFolder}/hisabdesk-data.json`, json);
      const srcRoot = await getFilesRoot();
      const dstRoot = `${backupFolder}/HisabDesk-Files`;
      if (await exists(srcRoot)) await copyDir(srcRoot, dstRoot);

      showToast("success", "Backup complete", `Saved to: hisabdesk-backup-${stamp}`);
    } catch (e) { showToast("error", "Backup failed", String(e)); }
    finally { setBusy(false); }
  }

  async function buildBackupJson(): Promise<string> {
    const db = await getDb();
    const tables = ["clients", "staff", "services", "client_services", "work_assignments", "vat_tracking", "invoices", "payments", "client_documents", "client_document_files", "registration_types", "business_categories", "document_types", "settings"];
    const backup: any = { exported_at: new Date().toISOString(), data: {} };
    for (const t of tables) backup.data[t] = await db.select<any[]>(`SELECT * FROM ${t}`);
    return JSON.stringify(backup, null, 2);
  }

  async function copyDir(src: string, dst: string) {
    if (!(await exists(dst))) await mkdir(dst, { recursive: true });
    const entries = await readDir(src);
    for (const entry of entries) {
      const s = `${src}/${entry.name}`;
      const d = `${dst}/${entry.name}`;
      if (entry.isDirectory) await copyDir(s, d);
      else await copyFile(s, d);
    }
  }

  function startRestore() {
    setConfirmState({
      open: true,
      title: "Restore from Backup",
      message: "Restoring will REPLACE all current data.\n\n  - Clients, work, invoices, payments\n  - Services, registration types, business categories\n  - Staff records\n  - All uploaded documents (if present in the backup)\n\nYour current data will be LOST unless you back it up first.\n\nHave you backed up your current data?",
      confirmLabel: "Continue to Restore",
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        await selectBackupFolder();
      },
    });
  }

  async function selectBackupFolder() {
    try {
      const source = await open({ directory: true, multiple: false });
      if (!source) return;
      const path = typeof source === "string" ? source : (source as any)?.path ?? String(source);
      if (!path) return;
      const jsonPath = `${path}/hisabdesk-data.json`;
      if (!(await exists(jsonPath))) {
        showToast("error", "Invalid backup folder", `Expected file not found:\n${jsonPath}`);
        return;
      }
      const filesPath = `${path}/HisabDesk-Files`;
      const hasFiles = await exists(filesPath);
      setConfirmState({
        open: true,
        title: "Final Confirmation",
        message: `Ready to restore from:\n${path}\n\nThis will PERMANENTLY REPLACE your current data.\n\nProceed with restore?`,
        confirmLabel: "Restore Now",
        onConfirm: async () => {
          setConfirmState((s) => ({ ...s, open: false }));
          await performRestore(jsonPath, filesPath, hasFiles);
        },
      });
    } catch (e) { showToast("error", "Restore failed", String(e)); }
  }

  async function performRestore(jsonPath: string, filesPath: string, hasFiles: boolean) {
    setBusy(true);
    showToast("loading", "Restoring...", "Please wait");
    try {
      const content = await readTextFile(jsonPath);
      const backup = JSON.parse(content);
      const db = await getDb();
      await db.execute("PRAGMA foreign_keys = OFF");
      const order = ["services", "registration_types", "business_categories", "document_types", "settings", "staff", "clients", "client_services", "client_documents", "client_document_files", "work_assignments", "vat_tracking", "invoices", "payments"];
      for (const t of [...order].reverse()) {
        if (backup.data[t]) await db.execute(`DELETE FROM ${t}`);
      }
      for (const t of order) {
        const rows = backup.data[t] || [];
        for (const row of rows) {
          const cols = Object.keys(row);
          const ph = cols.map(() => "?").join(",");
          await db.execute(`INSERT INTO ${t} (${cols.join(",")}) VALUES (${ph})`, cols.map((c) => row[c]));
        }
      }
      await db.execute("PRAGMA foreign_keys = ON");
      if (hasFiles) {
        const currentRoot = await getFilesRoot();
        await deleteDir(currentRoot);
        await mkdir(currentRoot, { recursive: true });
        await copyDir(filesPath, currentRoot);
      }
      showToast("success", "Restore complete", `Data restored.` + (hasFiles ? ` Files restored.` : ` Files unchanged.`) + `\nReload the app to see changes.`);
    } catch (e) {
      try { const db = await getDb(); await db.execute("PRAGMA foreign_keys = ON"); } catch {}
      showToast("error", "Restore failed", String(e));
    } finally { setBusy(false); }
  }

  async function deleteDir(path: string) {
    if (!(await exists(path))) return;
    const entries = await readDir(path);
    for (const entry of entries) {
      const p = `${path}/${entry.name}`;
      if (entry.isDirectory) await deleteDir(p);
      else { const { remove: rm } = await import("@tauri-apps/plugin-fs"); await rm(p); }
    }
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Backup & Restore</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create full backups or restore from a previous backup folder</p>
      </div>

      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            A <strong>Full Backup</strong> contains the database (as JSON) and all uploaded documents. Restoring replaces both.
          </div>
        </div>
      </div>

      <div className="border border-brand-200 dark:border-brand-800 rounded-lg p-5 space-y-3 bg-brand-50/30 dark:bg-brand-900/10">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-brand-600 dark:text-brand-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">Backup</h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Creates a folder containing:<br />
          • <code>hisabdesk-data.json</code> — all database records<br />
          • <code>HisabDesk-Files/</code> — {fileCount} uploaded file{fileCount !== 1 ? "s" : ""} ({formatBytes(fileSize)})
        </p>
        <button onClick={backupBoth} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
          <Download size={14} /> {busy ? "Working..." : "Backup Both"}
        </button>
      </div>

      <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-5 space-y-3 bg-amber-50/30 dark:bg-amber-900/10">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-amber-600 dark:text-amber-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">Restore</h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Select a backup folder created by "Backup Both".<br />
          <strong className="text-amber-900 dark:text-amber-300">Your current data will be replaced.</strong>
        </p>
        <button onClick={startRestore} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          <Upload size={14} /> {busy ? "Working..." : "Restore from Backup"}
        </button>
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel={confirmState.confirmLabel} danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />

      <Toast open={toast.open} type={toast.type} title={toast.title} message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </section>
  );
}

function ListEditor({ table, title }: { table: string; title: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const hasSortOrder = ["registration_types", "business_categories", "document_types"].includes(table);
      const orderBy = hasSortOrder ? "is_system DESC, sort_order, name" : "is_system DESC, name";
      const rows = await db.select<any[]>(`SELECT * FROM ${table} WHERE active = 1 ORDER BY ${orderBy}`);
      setItems(rows);
    } catch (e) { console.error(`Failed to load ${table}:`, e); setError(String(e)); }
    finally { setLoading(false); }
  }

  async function add() {
    if (!newName.trim()) return;
    try {
      const db = await getDb();
      await db.execute(`INSERT INTO ${table} (name, is_system) VALUES (?, 0)`, [newName.trim()]);
      setNewName("");
      load();
    } catch (e) { alert("Add failed: " + e); }
  }

  function handleDelete(it: any) {
    if (it.is_system === 1) return;
    setConfirmState({
      open: true,
      title: `Delete ${title.replace(/s$/, "")}`,
      message: `Delete "${it.name}"?\n\nThis will also clean up any references to it.\n\nThis cannot be undone.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const result = await hardDeleteLookup(table, it.id);
        if (!result.ok) { alert("Delete failed: " + result.message); return; }
        load();
      },
    });
  }

  const builtinCount = items.filter((it) => it.is_system === 1).length;
  const customCount = items.length - builtinCount;

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        <div className="text-xs text-gray-500 dark:text-gray-400">{builtinCount} built-in · {customCount} custom</div>
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`Add new`} className="input flex-1" />
        <button onClick={add} className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add</button>
      </div>
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</p>}
      {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">Error: {error}</div>}
      {!loading && !error && (
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {items.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No items. Add one above.</p>}
          {items.map((it) => {
            const isBuiltin = it.is_system === 1;
            return (
              <div key={it.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 dark:text-white">{it.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isBuiltin ? "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400" : "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"}`}>
                    {isBuiltin ? "built-in" : "custom"}
                  </span>
                </div>
                <div>
                  {!isBuiltin && (
                    <button onClick={() => handleDelete(it)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Delete" danger onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </section>
  );
}

function FiscalYearSettings() {
  const [current, setCurrent] = useState("");
  const [newFY, setNewFY] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>(
    { open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const [row] = await db.select<any[]>("SELECT value FROM settings WHERE key='fiscal_year'");
      setCurrent(row?.value || "2083/84");
    })();
  }, []);

  function roll() {
    if (!newFY.trim()) return;
    setConfirmState({
      open: true,
      title: "Roll Forward Fiscal Year",
      message: `Roll forward to ${newFY}?\n\nThis will regenerate recurring work for all regular clients.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const count = await rollForwardFiscalYear(newFY.trim());
        setCurrent(newFY.trim());
        setNewFY("");
        setStatus(`Rolled forward. Recurring work regenerated for ${count} regular clients.`);
        setTimeout(() => setStatus(null), 4000);
      },
    });
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"><RefreshCcw size={18} /></div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Fiscal Year</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Shrawan → Ashadh roll-forward</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Current</label>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{current}</div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">New FY</label>
          <input value={newFY} onChange={(e) => setNewFY(e.target.value)} placeholder="2084/85" className="input" />
        </div>
      </div>
      <button onClick={roll} disabled={!newFY.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
        <RefreshCcw size={14} /> Roll Forward
      </button>
      {status && <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">{status}</div>}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
        confirmLabel="Roll Forward" onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))} />
    </section>
  );
}
