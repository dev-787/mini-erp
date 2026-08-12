import { getPool, isPgConnected, findUserById } from './index.js';

export interface AuditLogItem {
  id: string;
  category: 'Stock' | 'Challan' | 'Customer' | 'Security';
  action: string;
  details: string;
  entity_ref: string;
  performed_by: string;
  created_at: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Get unified system audit trail combining Stock Movements, Sales Challans, Customer Notes, and User Invites
 */
export const findAuditLogs = async (
  params: AuditLogQueryParams
): Promise<{ data: AuditLogItem[]; total: number; page: number; limit: number }> => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const unionQuery = `
        SELECT * FROM (
          -- 1. Stock Movements Audit Logs
          SELECT
            sm.id,
            'Stock'::text AS category,
            ('Stock ' || sm.movement_type)::text AS action,
            (sm.reason || ' (' || sm.quantity || ' units of ' || p.name || ')')::text AS details,
            p.sku::text AS entity_ref,
            COALESCE(u.name, 'System User')::text AS performed_by,
            sm.created_at
          FROM stock_movements sm
          JOIN products p ON sm.product_id = p.id
          LEFT JOIN users u ON sm.created_by = u.id

          UNION ALL

          -- 2. Sales Challans Audit Logs
          SELECT
            ch.id,
            'Challan'::text AS category,
            ('Challan ' || ch.status)::text AS action,
            ('Challan #' || ch.challan_number || ' for ' || c.name || ' (' || ch.total_quantity || ' units)')::text AS details,
            ch.challan_number::text AS entity_ref,
            COALESCE(u.name, 'System User')::text AS performed_by,
            ch.updated_at AS created_at
          FROM challans ch
          JOIN customers c ON ch.customer_id = c.id
          LEFT JOIN users u ON COALESCE(ch.cancelled_by, ch.confirmed_by, ch.created_by) = u.id

          UNION ALL

          -- 3. Customer CRM Follow-up Notes
          SELECT
            cn.id,
            'Customer'::text AS category,
            'Note Logged'::text AS action,
            ('Follow-up note for ' || c.name || ': "' || SUBSTRING(cn.note FROM 1 FOR 60) || '"')::text AS details,
            c.name::text AS entity_ref,
            COALESCE(u.name, 'System User')::text AS performed_by,
            cn.created_at
          FROM customer_notes cn
          JOIN customers c ON cn.customer_id = c.id
          LEFT JOIN users u ON cn.created_by = u.id

          UNION ALL

          -- 4. User Invites & Security Events
          SELECT
            inv.id,
            'Security'::text AS category,
            ('Invite ' || inv.status)::text AS action,
            ('User invite for ' || inv.email || ' with role ' || inv.role)::text AS details,
            inv.email::text AS entity_ref,
            COALESCE(u.name, 'System Admin')::text AS performed_by,
            inv.created_at
          FROM invites inv
          LEFT JOIN users u ON inv.invited_by = u.id
        ) combined_audit
      `;

      const whereClauses: string[] = [];
      const values: any[] = [];
      let valIdx = 1;

      if (params.category && params.category !== 'All') {
        whereClauses.push(`category = $${valIdx}`);
        values.push(params.category);
        valIdx++;
      }

      if (params.search) {
        whereClauses.push(`(action ILIKE $${valIdx} OR details ILIKE $${valIdx} OR entity_ref ILIKE $${valIdx} OR performed_by ILIKE $${valIdx})`);
        values.push(`%${params.search}%`);
        valIdx++;
      }

      if (params.date_from) {
        whereClauses.push(`created_at >= $${valIdx}`);
        values.push(params.date_from);
        valIdx++;
      }

      if (params.date_to) {
        whereClauses.push(`created_at <= $${valIdx}`);
        values.push(params.date_to);
        valIdx++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM (${unionQuery}) audit_sub ${whereSql}`,
        values
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await pool.query(
        `SELECT * FROM (${unionQuery}) audit_sub ${whereSql} ORDER BY created_at DESC LIMIT $${valIdx} OFFSET $${valIdx + 1}`,
        [...values, limit, offset]
      );

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
      };
    } catch (err: any) {
      console.warn('[AuditDB] PG audit query error:', err.message);
    }
  }

  // Memory store fallback
  const { findGlobalStockMovements } = await import('./product.db.js');
  const { findChallans } = await import('./challan.db.js');

  const stockMovs = await findGlobalStockMovements({ limit: 100 });
  const challansList = await findChallans({ limit: 100 });

  const logs: AuditLogItem[] = [];

  for (const sm of stockMovs.data) {
    logs.push({
      id: sm.id,
      category: 'Stock',
      action: `Stock ${sm.movement_type}`,
      details: `${sm.reason} (${sm.quantity} units of ${sm.product_name})`,
      entity_ref: sm.product_sku,
      performed_by: sm.created_by_name || 'System User',
      created_at: sm.created_at,
    });
  }

  for (const ch of challansList.data) {
    logs.push({
      id: ch.id,
      category: 'Challan',
      action: `Challan ${ch.status}`,
      details: `Challan #${ch.challan_number} for ${ch.customer_name} (${ch.total_quantity} units)`,
      entity_ref: ch.challan_number,
      performed_by: ch.cancelled_by_name || ch.confirmed_by_name || ch.created_by_name || 'System User',
      created_at: ch.updated_at || ch.created_at,
    });
  }

  let filtered = [...logs];

  if (params.category && params.category !== 'All') {
    filtered = filtered.filter((l) => l.category === params.category);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.action.toLowerCase().includes(s) ||
        l.details.toLowerCase().includes(s) ||
        l.entity_ref.toLowerCase().includes(s) ||
        l.performed_by.toLowerCase().includes(s)
    );
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    data: paginated,
    total,
    page,
    limit,
  };
};
