import { getDb } from "./db";
import { exists, mkdir, copyFile, remove, stat } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { homeDir } from "@tauri-apps/api/path";

export async function getFilesRoot(): Promise<string> {
  const db = await getDb();
  const [row] = await db.select<any[]>("SELECT value FROM settings WHERE key='files_root_path'");
  if (row?.value?.trim()) return row.value.trim();
  const home = await homeDir();
  return `${home.replace(/\/$/, "")}/HisabDesk-Files`;
}
export async function setFilesRoot(path: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key,value,updated_at) VALUES ('files_root_path',?,datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    [path]
  );
}
const sanitize = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_");
const tsSuffix = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
async function ensureFolder(path: string): Promise<void> {
  if (!(await exists(path))) await mkdir(path, { recursive: true });
}
export async function pickAndAttachFile(clientId: number, clientCode: string, docTypeId: number, docTypeName: string) {
  const source = await open({ multiple: false, directory: false });
  if (!source) return null;
  const sourcePath: string =
    typeof source === "string"
      ? source
      : (source as any)?.path ?? String(source);
  if (!sourcePath) return null;
  const root = await getFilesRoot();
  const targetDir = `${root}/${sanitize(clientCode)}/${sanitize(docTypeName)}`;
  await ensureFolder(targetDir);
  const originalName = sourcePath.split(/[\\/]/).pop() || "file";
  const dot = originalName.lastIndexOf(".");
  const baseName = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = dot > 0 ? originalName.slice(dot) : "";
  const storedName = `${sanitize(baseName)}-${tsSuffix()}${ext}`;
  const targetPath = `${targetDir}/${storedName}`;
  await copyFile(sourcePath, targetPath);
  let size: number | null = null;
  try { const info = await stat(targetPath); size = info.size ?? null; } catch {}
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO client_document_files (client_id, document_type_id, file_name, stored_name, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)`,
    [clientId, docTypeId, originalName, storedName, targetPath, size]
  );
  const id = Number((result as any).lastInsertId);
  const [row] = await db.select<any[]>("SELECT * FROM client_document_files WHERE id = ?", [id]);
  await db.execute(
    `INSERT INTO client_documents (client_id, document_type_id, status, received_date) VALUES (?, ?, 'yes', date('now'))
     ON CONFLICT(client_id, document_type_id) DO UPDATE SET status='yes', received_date=COALESCE(client_documents.received_date, date('now'))`,
    [clientId, docTypeId]
  );
  return row;
}
export async function listFilesForClient(clientId: number) {
  const db = await getDb();
  const rows = await db.select<any[]>("SELECT * FROM client_document_files WHERE client_id = ? ORDER BY uploaded_at DESC", [clientId]);
  const grouped: any = {};
  for (const r of rows) {
    if (!grouped[r.document_type_id]) grouped[r.document_type_id] = [];
    grouped[r.document_type_id].push(r);
  }
  return grouped;
}
export async function openFile(file: any) { await openPath(file.file_path); }
export async function deleteFile(file: any) {
  try { if (await exists(file.file_path)) await remove(file.file_path); } catch {}
  const db = await getDb();
  await db.execute("DELETE FROM client_document_files WHERE id = ?", [file.id]);
  const [count] = await db.select<any[]>(
    "SELECT COUNT(*) as c FROM client_document_files WHERE client_id=? AND document_type_id=?",
    [file.client_id, file.document_type_id]
  );
  if ((count?.c ?? 0) === 0) {
    await db.execute(
      "UPDATE client_documents SET status='no', received_date=NULL WHERE client_id=? AND document_type_id=?",
      [file.client_id, file.document_type_id]
    );
  }
}
export async function getTotalFileCount(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select<any[]>("SELECT COUNT(*) as c FROM client_document_files");
  return row?.c ?? 0;
}
export async function getTotalFileSize(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select<any[]>("SELECT COALESCE(SUM(file_size),0) as s FROM client_document_files");
  return row?.s ?? 0;
}
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const u = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
