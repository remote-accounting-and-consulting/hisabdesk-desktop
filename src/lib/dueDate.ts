import { getDb } from "./db";
export async function recalculateDueDates(): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE work_assignments SET status='overdue', updated_at=datetime('now') WHERE status NOT IN ('completed','overdue') AND due_date IS NOT NULL AND date(due_date) < date('now')`);
  await db.execute(`UPDATE work_assignments SET status='due_today', updated_at=datetime('now') WHERE status NOT IN ('completed','overdue','due_today') AND due_date IS NOT NULL AND date(due_date) = date('now')`);
  await db.execute(`UPDATE work_assignments SET status='due_soon', updated_at=datetime('now') WHERE status NOT IN ('completed','overdue','due_today','due_soon') AND due_date IS NOT NULL AND date(due_date) > date('now') AND date(due_date) <= date('now','+3 days')`);
}
export async function recalculateVATStatus(): Promise<void> {}
