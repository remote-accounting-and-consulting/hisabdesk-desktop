import Database from "@tauri-apps/plugin-sql";
let db: Database | null = null;
export async function getDb(): Promise<Database> {
  if (!db) db = await Database.load("sqlite:hisabdesk.db");
  return db;
}
export async function initializeDatabase(): Promise<void> {
  const database = await getDb();
  await database.select("SELECT 1");
}
export async function logAudit(action: string, entityType: string | null, entityId: number | null, details?: any): Promise<void> {
  try {
    const database = await getDb();
    await database.execute(
      "INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)",
      [action, entityType, entityId, details ? JSON.stringify(details) : null]
    );
  } catch {}
}
