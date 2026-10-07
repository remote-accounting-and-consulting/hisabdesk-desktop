import { getDb } from "./db";
import { NEPALI_MONTHS } from "./nepal-data";

export async function generateRecurringWork(clientId: number): Promise<void> {
  const db = await getDb();
  const [client] = await db.select<any[]>("SELECT * FROM clients WHERE id = ?", [clientId]);
  if (!client || client.category !== "regular") return;
  const [fyRow] = await db.select<any[]>("SELECT value FROM settings WHERE key='fiscal_year'");
  const fiscalYear = fyRow?.value || "2083/84";

  for (let i = 0; i < 12; i++) {
    await db.execute(
      `INSERT OR IGNORE INTO vat_tracking (client_id, fiscal_year, month_index, month_name, status) VALUES (?, ?, ?, ?, 'pending')`,
      [clientId, fiscalYear, i + 1, NEPALI_MONTHS[i]]
    );
  }

  const assigned = await db.select<any[]>(
    `SELECT s.id, s.name FROM client_services cs JOIN services s ON s.id = cs.service_id WHERE cs.client_id = ?`,
    [clientId]
  );

  const auditSvc = assigned.find((s: any) => s.name === "Audit");
  if (auditSvc) {
    const [exists] = await db.select<any[]>(
      "SELECT id FROM work_assignments WHERE client_id=? AND service_id=? AND fiscal_year=?",
      [clientId, auditSvc.id, fiscalYear]
    );
    if (!exists) {
      await db.execute(
        `INSERT INTO work_assignments (client_id, service_id, title, fiscal_year, priority, status, due_date) VALUES (?, ?, ?, ?, 'medium', 'not_started', date('now','+6 months'))`,
        [clientId, auditSvc.id, `Annual Audit ${fiscalYear}`, fiscalYear]
      );
    }
  }

  const taxSvc = assigned.find((s: any) => s.name === "Tax Clearance");
  if (taxSvc) {
    const [exists] = await db.select<any[]>(
      "SELECT id FROM work_assignments WHERE client_id=? AND service_id=? AND fiscal_year=?",
      [clientId, taxSvc.id, fiscalYear]
    );
    if (!exists) {
      await db.execute(
        `INSERT INTO work_assignments (client_id, service_id, title, fiscal_year, priority, status, due_date) VALUES (?, ?, ?, ?, 'medium', 'not_started', date('now','+9 months'))`,
        [clientId, taxSvc.id, `Tax Clearance ${fiscalYear}`, fiscalYear]
      );
    }
  }

  const bookSvc = assigned.find((s: any) => s.name === "Bookkeeping");
  if (bookSvc) {
    for (let i = 0; i < 12; i++) {
      const title = `Bookkeeping ${NEPALI_MONTHS[i]} ${fiscalYear}`;
      const [exists] = await db.select<any[]>(
        "SELECT id FROM work_assignments WHERE client_id=? AND service_id=? AND title=?",
        [clientId, bookSvc.id, title]
      );
      if (!exists) {
        await db.execute(
          `INSERT INTO work_assignments (client_id, service_id, title, fiscal_year, priority, status, due_date) VALUES (?, ?, ?, ?, 'medium', 'not_started', date('now','+' || ? || ' days'))`,
          [clientId, bookSvc.id, title, fiscalYear, 30 + i * 30]
        );
      }
    }
  }
}

export async function rollForwardFiscalYear(newFiscalYear: string): Promise<number> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key,value,updated_at) VALUES ('fiscal_year',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [newFiscalYear]
  );
  const clients = await db.select<any[]>("SELECT id FROM clients WHERE category='regular' AND active=1");
  for (const c of clients) await generateRecurringWork(c.id);
  return clients.length;
}
