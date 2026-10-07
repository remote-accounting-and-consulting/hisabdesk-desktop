import { getDb } from "./db";

/**
 * Delete a client. Refuses if the client has any related records
 * (work, invoices, payments, documents, files, VAT) unless force=true.
 */
export async function deleteClient(
  clientId: number,
  force = false
): Promise<{ ok: boolean; message: string }> {
  const db = await getDb();

  const [checks] = await db.select<any[]>(
    `SELECT
      (SELECT COUNT(*) FROM work_assignments WHERE client_id = ?) as work_count,
      (SELECT COUNT(*) FROM invoices WHERE client_id = ?) as invoice_count,
      (SELECT COUNT(*) FROM payments WHERE client_id = ?) as payment_count,
      (SELECT COUNT(*) FROM client_documents WHERE client_id = ?) as doc_count,
      (SELECT COUNT(*) FROM client_document_files WHERE client_id = ?) as file_count,
      (SELECT COUNT(*) FROM vat_tracking WHERE client_id = ?) as vat_count`,
    [clientId, clientId, clientId, clientId, clientId, clientId]
  );

  const total =
    (checks?.work_count || 0) +
    (checks?.invoice_count || 0) +
    (checks?.payment_count || 0) +
    (checks?.doc_count || 0) +
    (checks?.file_count || 0) +
    (checks?.vat_count || 0);

  if (total > 0 && !force) {
    return {
      ok: false,
      message:
        `This client has ${total} related records ` +
        `(work: ${checks.work_count}, invoices: ${checks.invoice_count}, ` +
        `payments: ${checks.payment_count}, docs: ${checks.doc_count}, ` +
        `files: ${checks.file_count}, VAT: ${checks.vat_count}).\n\n` +
        `Archive the client instead, or force delete.`,
    };
  }

  await db.execute("DELETE FROM clients WHERE id = ?", [clientId]);
  return { ok: true, message: "Client deleted" };
}

/**
 * Delete a staff member. Refuses if they have any work assignments unless force=true.
 */
export async function deleteStaff(
  staffId: number,
  force = false
): Promise<{ ok: boolean; message: string }> {
  const db = await getDb();

  const [checks] = await db.select<any[]>(
    `SELECT
      (SELECT COUNT(*) FROM work_assignments WHERE assigned_staff_id = ?) as work_count,
      (SELECT COUNT(*) FROM work_assignments WHERE supervisor_id = ?) as sup_count`,
    [staffId, staffId]
  );

  const total = (checks?.work_count || 0) + (checks?.sup_count || 0);

  if (total > 0 && !force) {
    return {
      ok: false,
      message:
        `This staff member is assigned to ${total} work item(s).\n\n` +
        `Reassign their work first, or force delete.`,
    };
  }

  await db.execute("DELETE FROM staff WHERE id = ?", [staffId]);
  return { ok: true, message: "Staff deleted" };
}

/**
 * Delete a lookup row (services, registration_types, business_categories,
 * document_types). Refuses if referenced anywhere.
 */
export async function deleteLookup(
  table: string,
  id: number
): Promise<{ ok: boolean; message: string }> {
  const db = await getDb();

  const refTable: Record<string, { table: string; column: string }> = {
    services: { table: "client_services", column: "service_id" },
    registration_types: { table: "clients", column: "registration_type_id" },
    business_categories: { table: "clients", column: "business_category_id" },
    document_types: { table: "client_documents", column: "document_type_id" },
  };

  const ref = refTable[table];
  if (ref) {
    const [check] = await db.select<any[]>(
      `SELECT COUNT(*) as c FROM ${ref.table} WHERE ${ref.column} = ?`,
      [id]
    );
    if ((check?.c || 0) > 0) {
      return {
        ok: false,
        message:
          `Cannot delete: ${check.c} record(s) reference this item.\n\n` +
          `Disable it instead.`,
      };
    }
  }

  await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return { ok: true, message: "Deleted" };
}
