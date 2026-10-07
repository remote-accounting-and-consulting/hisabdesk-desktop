import { getDb } from "./db";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * Scan the database for pending/overdue items and create notifications.
 * Uses dedupe_key so the same alert never fires twice.
 * Also fires an OS-level native notification for each new one.
 */
export async function scanAndCreateNotifications(): Promise<number> {
  const db = await getDb();
  let created = 0;

  // Request OS notification permission once
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  const newNotifications: Array<{
    title: string;
    message: string;
    type: string;
    link: string;
  }> = [];

  // ============ 1. Work due today ============
  const dueToday = await db.select<any[]>(`
    SELECT w.id, c.name as client_name, s.name as service_name
    FROM work_assignments w
    JOIN clients c ON c.id = w.client_id
    JOIN services s ON s.id = w.service_id
    WHERE w.status NOT IN ('completed', 'overdue')
      AND date(w.due_date) = date('now')
  `);

  for (const w of dueToday) {
    const r = await tryInsert(
      db,
      `Due today: ${w.client_name}`,
      `${w.service_name} is due today`,
      "warning",
      `/work/${w.id}/edit`,
      `work:${w.id}:due_today`
    );
    if (r) {
      created++;
      newNotifications.push({
        title: `Due today: ${w.client_name}`,
        message: `${w.service_name} is due today`,
        type: "warning",
        link: `/work/${w.id}/edit`,
      });
    }
  }

  // ============ 2. Work due tomorrow ============
  const dueTomorrow = await db.select<any[]>(`
    SELECT w.id, c.name as client_name, s.name as service_name
    FROM work_assignments w
    JOIN clients c ON c.id = w.client_id
    JOIN services s ON s.id = w.service_id
    WHERE w.status NOT IN ('completed', 'overdue')
      AND date(w.due_date) = date('now', '+1 day')
  `);

  for (const w of dueTomorrow) {
    const r = await tryInsert(
      db,
      `Due tomorrow: ${w.client_name}`,
      `${w.service_name} is due tomorrow`,
      "info",
      `/work/${w.id}/edit`,
      `work:${w.id}:due_tomorrow`
    );
    if (r) {
      created++;
      newNotifications.push({
        title: `Due tomorrow: ${w.client_name}`,
        message: `${w.service_name} is due tomorrow`,
        type: "info",
        link: `/work/${w.id}/edit`,
      });
    }
  }

  // ============ 3. Overdue work ============
  const overdue = await db.select<any[]>(`
    SELECT w.id, c.name as client_name, s.name as service_name, w.due_date
    FROM work_assignments w
    JOIN clients c ON c.id = w.client_id
    JOIN services s ON s.id = w.service_id
    WHERE w.status = 'overdue'
  `);

  for (const w of overdue) {
    const r = await tryInsert(
      db,
      `Overdue: ${w.client_name}`,
      `${w.service_name} was due ${w.due_date}`,
      "danger",
      `/work/${w.id}/edit`,
      `work:${w.id}:overdue`
    );
    if (r) {
      created++;
      newNotifications.push({
        title: `Overdue: ${w.client_name}`,
        message: `${w.service_name} was due ${w.due_date}`,
        type: "danger",
        link: `/work/${w.id}/edit`,
      });
    }
  }

  // ============ 4. VAT late ============
  const vatLate = await db.select<any[]>(`
    SELECT v.id, v.month_name, v.fiscal_year, c.name as client_name
    FROM vat_tracking v
    JOIN clients c ON c.id = v.client_id
    WHERE v.status = 'late'
  `);

  for (const v of vatLate) {
    const r = await tryInsert(
      db,
      `VAT late: ${v.client_name}`,
      `${v.month_name} ${v.fiscal_year} VAT return is late`,
      "danger",
      `/vat`,
      `vat:${v.id}:late`
    );
    if (r) {
      created++;
      newNotifications.push({
        title: `VAT late: ${v.client_name}`,
        message: `${v.month_name} ${v.fiscal_year} VAT return is late`,
        type: "danger",
        link: `/vat`,
      });
    }
  }

  // ============ 5. Invoices overdue ============
  const overdueInvoices = await db.select<any[]>(`
    SELECT i.id, i.invoice_no, i.due_date, i.total_amount, i.paid_amount,
           c.name as client_name
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE i.status IN ('unpaid', 'partial')
      AND i.due_date IS NOT NULL
      AND date(i.due_date) < date('now')
  `);

  for (const inv of overdueInvoices) {
    const balance = inv.total_amount - inv.paid_amount;
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.due_date).getTime()) / 86400000
    );

    const r = await tryInsert(
      db,
      `Invoice overdue: ${inv.client_name}`,
      `${inv.invoice_no} — Rs. ${balance.toLocaleString("en-IN")} — ${daysOverdue} days overdue`,
      "warning",
      `/fees`,
      `invoice:${inv.id}:overdue`
    );
    if (r) {
      created++;
      newNotifications.push({
        title: `Invoice overdue: ${inv.client_name}`,
        message: `${inv.invoice_no} — Rs. ${balance.toLocaleString("en-IN")}`,
        type: "warning",
        link: `/fees`,
      });
    }
  }

  // ============ Fire OS-level native notifications ============
  if (permissionGranted) {
    for (const n of newNotifications) {
      try {
        sendNotification({
          title: `HisabDesk — ${n.title}`,
          body: n.message,
        });
      } catch (e) {
        console.warn("Native notification failed:", e);
      }
    }
  }

  return created;
}

async function tryInsert(
  db: any,
  title: string,
  message: string,
  type: string,
  link: string,
  dedupeKey: string
): Promise<boolean> {
  try {
    const result = await db.execute(
      `INSERT OR IGNORE INTO notifications (title, message, type, link, dedupe_key)
       VALUES (?, ?, ?, ?, ?)`,
      [title, message, type, link, dedupeKey]
    );
    // rowsAffected > 0 means insert actually happened (not a duplicate)
    return Number((result as any).rowsAffected ?? 0) > 0;
  } catch (e) {
    console.warn("Notification insert failed:", e);
    return false;
  }
}

/**
 * Delete read notifications older than 30 days.
 */
export async function cleanupOldNotifications(): Promise<void> {
  const db = await getDb();
  await db.execute(`
    DELETE FROM notifications
    WHERE read = 1
      AND date(created_at) < date('now', '-30 days')
  `);
}

/**
 * Fire a one-off notification from anywhere in the app.
 * Both in-app and OS-level.
 */
export async function notifyNow(
  title: string,
  message: string,
  type: "info" | "warning" | "danger" | "success" = "info",
  link?: string
): Promise<void> {
  const db = await getDb();
  const key = `manual:${Date.now()}:${title}`;

  await db.execute(
    `INSERT INTO notifications (title, message, type, link, dedupe_key)
     VALUES (?, ?, ?, ?, ?)`,
    [title, message, type, link || null, key]
  );

  const permissionGranted = await isPermissionGranted();
  if (permissionGranted) {
    sendNotification({
      title: `HisabDesk — ${title}`,
      body: message,
    });
  }
}
