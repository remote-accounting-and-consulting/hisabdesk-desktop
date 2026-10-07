import { getDb } from "./db";
import { exists, remove } from "@tauri-apps/plugin-fs";

/* ================================================================ */
/*  HELPERS                                                          */
/* ================================================================ */

async function safeRemoveFile(path: string): Promise<void> {
  try {
    if (await exists(path)) await remove(path);
  } catch {}
}

async function deleteClientFiles(clientId: number): Promise<number> {
  const db = await getDb();
  const files = await db.select<{ file_path: string }[]>(
    "SELECT file_path FROM client_document_files WHERE client_id = ?",
    [clientId]
  );
  let removed = 0;
  for (const f of files) {
    await safeRemoveFile(f.file_path);
    removed++;
  }
  return removed;
}

/* ================================================================ */
/*  CLIENT — full cascade                                            */
/* ================================================================ */

export async function hardDeleteClient(
  clientId: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    const [before] = await db.select<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM work_assignments WHERE client_id = ?) as work,
         (SELECT COUNT(*) FROM invoices WHERE client_id = ?) as invoices,
         (SELECT COUNT(*) FROM payments WHERE client_id = ?) as payments,
         (SELECT COUNT(*) FROM vat_tracking WHERE client_id = ?) as vat,
         (SELECT COUNT(*) FROM client_services WHERE client_id = ?) as services,
         (SELECT COUNT(*) FROM client_documents WHERE client_id = ?) as docs,
         (SELECT COUNT(*) FROM client_document_files WHERE client_id = ?) as files`,
      [clientId, clientId, clientId, clientId, clientId, clientId, clientId]
    );

    const filesRemoved = await deleteClientFiles(clientId);

    await db.execute("DELETE FROM payments WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM invoices WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM client_document_files WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM client_documents WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM work_assignments WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM vat_tracking WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM client_services WHERE client_id = ?", [clientId]);
    await db.execute("DELETE FROM clients WHERE id = ?", [clientId]);

    return {
      ok: true,
      message: "Client and all related data deleted",
      stats: {
        work: before?.work || 0,
        invoices: before?.invoices || 0,
        payments: before?.payments || 0,
        vat: before?.vat || 0,
        services: before?.services || 0,
        docs: before?.docs || 0,
        files: filesRemoved,
      },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================================================================ */
/*  STAFF — unassign work, delete staff                              */
/* ================================================================ */

export async function hardDeleteStaff(
  staffId: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    const [before] = await db.select<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM work_assignments WHERE assigned_staff_id = ?) as work,
         (SELECT COUNT(*) FROM work_assignments WHERE supervisor_id = ?) as sup`,
      [staffId, staffId]
    );

    await db.execute(
      "UPDATE work_assignments SET assigned_staff_id = NULL WHERE assigned_staff_id = ?",
      [staffId]
    );
    await db.execute(
      "UPDATE work_assignments SET supervisor_id = NULL WHERE supervisor_id = ?",
      [staffId]
    );
    await db.execute(
      "UPDATE vat_tracking SET assigned_staff_id = NULL WHERE assigned_staff_id = ?",
      [staffId]
    );
    await db.execute("DELETE FROM staff WHERE id = ?", [staffId]);

    return {
      ok: true,
      message: "Staff deleted",
      stats: { work_unassigned: (before?.work || 0) + (before?.sup || 0) },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================================================================ */
/*  WORK ASSIGNMENT                                                  */
/* ================================================================ */

export async function hardDeleteWork(
  workId: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    const [before] = await db.select<any[]>(
      "SELECT COUNT(*) as invoices FROM invoices WHERE work_id = ?",
      [workId]
    );

    await db.execute("UPDATE invoices SET work_id = NULL WHERE work_id = ?", [workId]);
    await db.execute("DELETE FROM work_assignments WHERE id = ?", [workId]);

    return {
      ok: true,
      message: "Work deleted",
      stats: { invoices_unlinked: before?.invoices || 0 },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================================================================ */
/*  INVOICE — hard delete (removes its payments too)                */
/* ================================================================ */

export async function hardDeleteInvoice(
  invoiceId: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    const [before] = await db.select<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM payments WHERE invoice_id = ?) as payments,
         (SELECT invoice_no FROM invoices WHERE id = ?) as invoice_no`,
      [invoiceId, invoiceId]
    );

    await db.execute("DELETE FROM payments WHERE invoice_id = ?", [invoiceId]);
    await db.execute("DELETE FROM invoices WHERE id = ?", [invoiceId]);

    return {
      ok: true,
      message: "Invoice deleted",
      stats: {
        invoice_no: before?.invoice_no,
        payments: before?.payments || 0,
      },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================================================================ */
/*  PAYMENT                                                          */
/* ================================================================ */

export async function hardDeletePayment(
  paymentId: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    const [pay] = await db.select<any[]>(
      "SELECT invoice_id, amount FROM payments WHERE id = ?",
      [paymentId]
    );
    if (!pay) return { ok: false, message: "Payment not found" };

    await db.execute("DELETE FROM payments WHERE id = ?", [paymentId]);

    const [total] = await db.select<any[]>(
      "SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE invoice_id = ?",
      [pay.invoice_id]
    );
    const newPaid = total?.s || 0;

    const [inv] = await db.select<any[]>(
      "SELECT total_amount FROM invoices WHERE id = ?",
      [pay.invoice_id]
    );
    if (inv) {
      const newStatus =
        newPaid >= inv.total_amount - 0.01
          ? "paid"
          : newPaid > 0
          ? "partial"
          : "unpaid";
      await db.execute(
        "UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?",
        [newPaid, newStatus, pay.invoice_id]
      );
    }

    return {
      ok: true,
      message: "Payment deleted",
      stats: { amount: pay.amount },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================================================================ */
/*  LOOKUP TABLES                                                    */
/* ================================================================ */

export async function hardDeleteLookup(
  table: string,
  id: number
): Promise<{ ok: boolean; message: string; stats?: any }> {
  try {
    const db = await getDb();

    // Safety: never delete built-in rows
    const [row] = await db.select<any[]>(
      `SELECT is_system FROM ${table} WHERE id = ?`,
      [id]
    );
    if (row?.is_system === 1) {
      return { ok: false, message: "Built-in items cannot be deleted" };
    }

    let cleaned = 0;

    if (table === "services") {
      const [r] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM client_services WHERE service_id = ?",
        [id]
      );
      cleaned = r?.c || 0;
      await db.execute("DELETE FROM client_services WHERE service_id = ?", [id]);
      await db.execute(
        "UPDATE work_assignments SET service_id = NULL WHERE service_id = ?",
        [id]
      );
      await db.execute(
        "UPDATE invoices SET service_id = NULL WHERE service_id = ?",
        [id]
      );
    } else if (table === "registration_types") {
      const [r] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM clients WHERE registration_type_id = ?",
        [id]
      );
      cleaned = r?.c || 0;
      await db.execute(
        "UPDATE clients SET registration_type_id = NULL WHERE registration_type_id = ?",
        [id]
      );
    } else if (table === "business_categories") {
      const [r] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM clients WHERE business_category_id = ?",
        [id]
      );
      cleaned = r?.c || 0;
      await db.execute(
        "UPDATE clients SET business_category_id = NULL WHERE business_category_id = ?",
        [id]
      );
    } else if (table === "document_types") {
      const [r] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM client_documents WHERE document_type_id = ?",
        [id]
      );
      cleaned = r?.c || 0;
      await db.execute(
        "DELETE FROM client_documents WHERE document_type_id = ?",
        [id]
      );
      await db.execute(
        "DELETE FROM client_document_files WHERE document_type_id = ?",
        [id]
      );
    }

    await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return {
      ok: true,
      message: `Deleted. Cleaned ${cleaned} reference(s).`,
      stats: { cleaned },
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
