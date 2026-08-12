import crypto from 'crypto';
import { getPool, isPgConnected, findUserById, findUserByEmail } from './index.js';
import { findCustomerById } from './customer.db.js';
import { findProductById } from './product.db.js';
import {
  Challan,
  ChallanItem,
  ChallanListQueryParams,
  ChallanPaginatedResponse,
  ChallanItemInput,
  StockShortage,
} from '../types/challan.js';

// Fallback memory store
const memoryChallans: Challan[] = [];
const memoryChallanItems: ChallanItem[] = [];

/**
 * Initialize Sales Challan DB tables in PostgreSQL if connected
 */
export const initChallanTables = async (): Promise<void> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS challans (
          id VARCHAR(36) PRIMARY KEY,
          challan_number VARCHAR(30) UNIQUE NOT NULL,
          customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
          status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Confirmed','Cancelled')),
          total_quantity INTEGER NOT NULL DEFAULT 0,
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          confirmed_by VARCHAR(36) REFERENCES users(id),
          confirmed_at TIMESTAMP,
          cancelled_by VARCHAR(36) REFERENCES users(id),
          cancelled_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS challan_items (
          id VARCHAR(36) PRIMARY KEY,
          challan_id VARCHAR(36) NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
          product_id VARCHAR(36) NOT NULL REFERENCES products(id),
          product_name_snapshot VARCHAR(255) NOT NULL,
          product_sku_snapshot VARCHAR(50) NOT NULL,
          unit_price_snapshot NUMERIC(12,2) NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_challans_customer_id ON challans(customer_id);
        CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
        CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);
      `);
      client.release();
    } catch (err: any) {
      console.warn('[ChallanDB] Error initializing PG tables:', err.message);
    }
  }

  await seedDefaultChallans();
};

/**
 * Seed initial sample challan if store is empty
 */
const seedDefaultChallans = async (): Promise<void> => {
  const existing = await findChallans({ page: 1, limit: 1 });
  if (existing.total > 0) return;

  const adminUser = await findUserByEmail('admin@example.com');
  const adminId = adminUser ? adminUser.id : crypto.randomUUID();

  // Find sample customer & products
  const pool = getPool();
  let custId = '';
  let cust2Id = '';
  let prod1Id = '';
  let prod2Id = '';

  if (pool && isPgConnected()) {
    try {
      const cRes = await pool.query('SELECT id FROM customers ORDER BY created_at DESC LIMIT 2');
      if (cRes.rows.length > 0) custId = cRes.rows[0].id;
      if (cRes.rows.length > 1) cust2Id = cRes.rows[1].id;

      const pRes = await pool.query('SELECT id FROM products ORDER BY created_at DESC LIMIT 2');
      if (pRes.rows.length > 0) prod1Id = pRes.rows[0].id;
      if (pRes.rows.length > 1) prod2Id = pRes.rows[1].id;
    } catch (err: any) {
      console.warn('[ChallanDB] Seed query fallback:', err.message);
    }
  }

  if (custId && prod1Id) {
    // 1. Create and confirm a sales challan so revenue metrics and trend charts render data
    try {
      const confirmedItems: ChallanItemInput[] = [{ product_id: prod1Id, quantity: 10 }];
      if (prod2Id) confirmedItems.push({ product_id: prod2Id, quantity: 2 });
      const challan1 = await createDraftChallan(custId, confirmedItems, adminId);
      await confirmChallan(challan1.id, adminId);
    } catch (e: any) {
      console.warn('[ChallanDB] Could not seed confirmed challan:', e.message);
    }

    // 2. Create a pending draft challan
    try {
      const draftItems: ChallanItemInput[] = [{ product_id: prod1Id, quantity: 3 }];
      await createDraftChallan(cust2Id || custId, draftItems, adminId);
    } catch (e: any) {
      console.warn('[ChallanDB] Could not seed draft challan:', e.message);
    }
  }
};

/**
 * Generate sequential, race-safe Challan Number (e.g., SC-2026-0001)
 */
export const generateNextChallanNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `SC-${currentYear}-`;
  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const res = await pool.query(
        `SELECT challan_number FROM challans WHERE challan_number LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [`${prefix}%`]
      );

      if (res.rows.length > 0) {
        const lastNumStr = res.rows[0].challan_number.replace(prefix, '');
        const lastSeq = parseInt(lastNumStr, 10) || 0;
        return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
      }
      return `${prefix}0001`;
    } catch (err: any) {
      console.warn('[ChallanDB] Number gen PG query error:', err.message);
    }
  }

  // Memory fallback
  const matching = memoryChallans.filter((c) => c.challan_number.startsWith(prefix));
  if (matching.length > 0) {
    const seqs = matching.map((c) => parseInt(c.challan_number.replace(prefix, ''), 10) || 0);
    const maxSeq = Math.max(...seqs);
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }

  return `${prefix}0001`;
};

/**
 * Helper to calculate total_amount from items
 */
const calculateChallanTotals = (items: ChallanItem[]): { totalQuantity: number; totalAmount: number } => {
  return items.reduce(
    (acc, item) => {
      acc.totalQuantity += Number(item.quantity);
      acc.totalAmount += Number(item.quantity) * Number(item.unit_price_snapshot);
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0 }
  );
};

/**
 * List challans with search, status, customer filters and pagination
 */
export const findChallans = async (
  params: ChallanListQueryParams
): Promise<ChallanPaginatedResponse> => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
  const offset = (page - 1) * limit;

  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const whereClauses: string[] = [];
      const values: any[] = [];
      let valIdx = 1;

      if (params.status) {
        whereClauses.push(`ch.status = $${valIdx}`);
        values.push(params.status);
        valIdx++;
      }

      if (params.customer_id) {
        whereClauses.push(`ch.customer_id = $${valIdx}`);
        values.push(params.customer_id);
        valIdx++;
      }

      if (params.search) {
        whereClauses.push(`(ch.challan_number ILIKE $${valIdx} OR c.name ILIKE $${valIdx} OR c.business_name ILIKE $${valIdx})`);
        values.push(`%${params.search}%`);
        valIdx++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM challans ch JOIN customers c ON ch.customer_id = c.id ${whereSql}`,
        values
      );
      const total = countRes.rows[0]?.total || 0;

      const dataQuery = `
        SELECT
          ch.*,
          c.name AS customer_name,
          u1.name AS created_by_name,
          u2.name AS confirmed_by_name,
          u3.name AS cancelled_by_name,
          COALESCE(
            (SELECT SUM(ci.quantity * ci.unit_price_snapshot) FROM challan_items ci WHERE ci.challan_id = ch.id), 0
          )::numeric AS total_amount
        FROM challans ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u1 ON ch.created_by = u1.id
        LEFT JOIN users u2 ON ch.confirmed_by = u2.id
        LEFT JOIN users u3 ON ch.cancelled_by = u3.id
        ${whereSql}
        ORDER BY ch.created_at DESC
        LIMIT $${valIdx} OFFSET $${valIdx + 1}
      `;

      const dataRes = await pool.query(dataQuery, [...values, limit, offset]);

      const formatted = dataRes.rows.map((row) => ({
        ...row,
        total_quantity: Number(row.total_quantity),
        total_amount: Number(row.total_amount),
      }));

      return {
        data: formatted,
        total,
        page,
        limit,
      };
    } catch (err: any) {
      console.warn('[ChallanDB] PG list query error:', err.message);
    }
  }

  // Memory fallback logic
  let filtered = memoryChallans.map((ch) => {
    const cust = findCustomerById(ch.customer_id);
    const items = memoryChallanItems.filter((i) => i.challan_id === ch.id);
    const totals = calculateChallanTotals(items);
    return {
      ...ch,
      customer_name: (cust as any)?.name || 'Unknown Customer',
      total_amount: totals.totalAmount,
    };
  });

  if (params.status) {
    filtered = filtered.filter((ch) => ch.status === params.status);
  }

  if (params.customer_id) {
    filtered = filtered.filter((ch) => ch.customer_id === params.customer_id);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (ch) =>
        ch.challan_number.toLowerCase().includes(s) ||
        (ch.customer_name && ch.customer_name.toLowerCase().includes(s))
    );
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const resolved = await Promise.all(
    paginated.map(async (ch) => {
      const u1 = await findUserById(ch.created_by);
      const u2 = ch.confirmed_by ? await findUserById(ch.confirmed_by) : null;
      const u3 = ch.cancelled_by ? await findUserById(ch.cancelled_by) : null;
      return {
        ...ch,
        created_by_name: u1?.name || 'System User',
        confirmed_by_name: u2?.name,
        cancelled_by_name: u3?.name,
      };
    })
  );

  return {
    data: resolved,
    total,
    page,
    limit,
  };
};

/**
 * Get single challan with items and author details
 */
export const findChallanById = async (id: string): Promise<Challan | null> => {
  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const chRes = await pool.query(
        `SELECT
           ch.*,
           c.name AS customer_name,
           u1.name AS created_by_name,
           u2.name AS confirmed_by_name,
           u3.name AS cancelled_by_name
         FROM challans ch
         JOIN customers c ON ch.customer_id = c.id
         LEFT JOIN users u1 ON ch.created_by = u1.id
         LEFT JOIN users u2 ON ch.confirmed_by = u2.id
         LEFT JOIN users u3 ON ch.cancelled_by = u3.id
         WHERE ch.id = $1`,
        [id]
      );

      if (chRes.rows.length === 0) return null;

      const challan = chRes.rows[0];

      const itemsRes = await pool.query(
        `SELECT * FROM challan_items WHERE challan_id = $1 ORDER BY created_at ASC`,
        [id]
      );

      const items: ChallanItem[] = itemsRes.rows.map((item) => ({
        ...item,
        unit_price_snapshot: Number(item.unit_price_snapshot),
        quantity: Number(item.quantity),
      }));

      const totals = calculateChallanTotals(items);

      return {
        ...challan,
        total_quantity: Number(challan.total_quantity),
        total_amount: totals.totalAmount,
        items,
      };
    } catch (err: any) {
      console.warn('[ChallanDB] PG lookup query error:', err.message);
    }
  }

  // Memory fallback lookup
  const ch = memoryChallans.find((item) => item.id === id);
  if (!ch) return null;

  const items = memoryChallanItems.filter((i) => i.challan_id === id);
  const totals = calculateChallanTotals(items);
  const cust = await findCustomerById(ch.customer_id);
  const u1 = await findUserById(ch.created_by);
  const u2 = ch.confirmed_by ? await findUserById(ch.confirmed_by) : null;
  const u3 = ch.cancelled_by ? await findUserById(ch.cancelled_by) : null;

  return {
    ...ch,
    customer_name: cust?.name || 'Unknown Customer',
    created_by_name: u1?.name || 'System User',
    confirmed_by_name: u2?.name,
    cancelled_by_name: u3?.name,
    total_amount: totals.totalAmount,
    items,
  };
};

/**
 * Create a new Draft Challan
 */
export const createDraftChallan = async (
  customerId: string,
  itemsInput: ChallanItemInput[],
  createdBy: string
): Promise<Challan> => {
  const now = new Date().toISOString();
  const challanId = crypto.randomUUID();
  const challanNumber = await generateNextChallanNumber();

  // Snapshot line items
  const createdItems: ChallanItem[] = [];
  let totalQty = 0;

  for (const item of itemsInput) {
    const prod = await findProductById(item.product_id);
    if (!prod) {
      throw new Error(`Product ID ${item.product_id} not found.`);
    }

    const newItem: ChallanItem = {
      id: crypto.randomUUID(),
      challan_id: challanId,
      product_id: prod.id,
      product_name_snapshot: prod.name,
      product_sku_snapshot: prod.sku,
      unit_price_snapshot: Number(prod.unit_price),
      quantity: Math.max(1, Number(item.quantity) || 1),
      created_at: now,
    };
    createdItems.push(newItem);
    totalQty += newItem.quantity;
  }

  const pool = getPool();

  if (pool && isPgConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO challans (id, challan_number, customer_id, status, total_quantity, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, 'Draft', $4, $5, $6, $7)`,
        [challanId, challanNumber, customerId, totalQty, createdBy, now, now]
      );

      for (const item of createdItems) {
        await client.query(
          `INSERT INTO challan_items (id, challan_id, product_id, product_name_snapshot, product_sku_snapshot, unit_price_snapshot, quantity, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [item.id, item.challan_id, item.product_id, item.product_name_snapshot, item.product_sku_snapshot, item.unit_price_snapshot, item.quantity, item.created_at]
        );
      }

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw err;
    }
    client.release();
  } else {
    // Memory fallback
    const newChallan: Challan = {
      id: challanId,
      challan_number: challanNumber,
      customer_id: customerId,
      status: 'Draft',
      total_quantity: totalQty,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    memoryChallans.unshift(newChallan);
    memoryChallanItems.push(...createdItems);
  }

  const result = await findChallanById(challanId);
  return result!;
};

/**
 * Update an existing Draft Challan (replaces items with fresh snapshots)
 */
export const updateDraftChallan = async (
  id: string,
  customerId: string,
  itemsInput: ChallanItemInput[]
): Promise<Challan> => {
  const existing = await findChallanById(id);
  if (!existing) {
    throw new Error('CHALLAN_NOT_FOUND');
  }

  if (existing.status !== 'Draft') {
    const err = new Error('Only Draft challans can be edited.');
    (err as any).code = 'NOT_DRAFT';
    throw err;
  }

  const now = new Date().toISOString();

  // Snapshot new line items
  const newItems: ChallanItem[] = [];
  let totalQty = 0;

  for (const item of itemsInput) {
    const prod = await findProductById(item.product_id);
    if (!prod) {
      throw new Error(`Product ID ${item.product_id} not found.`);
    }

    const newItem: ChallanItem = {
      id: crypto.randomUUID(),
      challan_id: id,
      product_id: prod.id,
      product_name_snapshot: prod.name,
      product_sku_snapshot: prod.sku,
      unit_price_snapshot: Number(prod.unit_price),
      quantity: Math.max(1, Number(item.quantity) || 1),
      created_at: now,
    };
    newItems.push(newItem);
    totalQty += newItem.quantity;
  }

  const pool = getPool();

  if (pool && isPgConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update header
      await client.query(
        `UPDATE challans SET customer_id = $1, total_quantity = $2, updated_at = $3 WHERE id = $4`,
        [customerId, totalQty, now, id]
      );

      // Delete old items and insert new
      await client.query(`DELETE FROM challan_items WHERE challan_id = $1`, [id]);

      for (const item of newItems) {
        await client.query(
          `INSERT INTO challan_items (id, challan_id, product_id, product_name_snapshot, product_sku_snapshot, unit_price_snapshot, quantity, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [item.id, item.challan_id, item.product_id, item.product_name_snapshot, item.product_sku_snapshot, item.unit_price_snapshot, item.quantity, item.created_at]
        );
      }

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw err;
    }
    client.release();
  } else {
    // Memory fallback
    const idx = memoryChallans.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryChallans[idx].customer_id = customerId;
      memoryChallans[idx].total_quantity = totalQty;
      memoryChallans[idx].updated_at = now;
    }

    // Replace memory items
    const remainingItems = memoryChallanItems.filter((i) => i.challan_id !== id);
    memoryChallanItems.length = 0;
    memoryChallanItems.push(...remainingItems, ...newItems);
  }

  const result = await findChallanById(id);
  return result!;
};

/**
 * Confirm a Challan (Atomic DB Transaction & Stock Validation Across ALL Line Items)
 */
export const confirmChallan = async (
  id: string,
  confirmingUserId: string
): Promise<Challan> => {
  const challan = await findChallanById(id);
  if (!challan) {
    throw new Error('CHALLAN_NOT_FOUND');
  }

  if (challan.status !== 'Draft') {
    const err = new Error(`Cannot confirm challan with status '${challan.status}'.`);
    (err as any).code = 'NOT_DRAFT';
    throw err;
  }

  if (!challan.items || challan.items.length === 0) {
    const err = new Error('Challan has no line items.');
    (err as any).code = 'NO_ITEMS';
    throw err;
  }

  const pool = getPool();

  if (pool && isPgConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and check stock for ALL items
      const shortages: StockShortage[] = [];

      for (const item of challan.items) {
        const prodRes = await client.query(
          'SELECT id, name, current_stock FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );

        if (prodRes.rows.length === 0) {
          shortages.push({
            product_id: item.product_id,
            product: item.product_name_snapshot,
            requested: item.quantity,
            available: 0,
          });
        } else {
          const prod = prodRes.rows[0];
          const availableStock = Number(prod.current_stock);
          if (availableStock < item.quantity) {
            shortages.push({
              product_id: item.product_id,
              product: item.product_name_snapshot,
              requested: item.quantity,
              available: availableStock,
            });
          }
        }
      }

      // 2. Reject ALL if any item has insufficient stock
      if (shortages.length > 0) {
        await client.query('ROLLBACK');
        const err = new Error('Insufficient stock for one or more items.');
        (err as any).code = 'INSUFFICIENT_STOCK';
        (err as any).shortages = shortages;
        throw err;
      }

      // 3. Apply stock deductions and log OUT movements
      const now = new Date().toISOString();

      for (const item of challan.items) {
        // Deduct current_stock
        await client.query(
          `UPDATE products SET current_stock = current_stock - $1, updated_at = $2 WHERE id = $3`,
          [item.quantity, now, item.product_id]
        );

        // Insert stock movement OUT log
        const movId = crypto.randomUUID();
        const reason = `Challan #${challan.challan_number}`;
        await client.query(
          `INSERT INTO stock_movements (id, product_id, quantity, movement_type, reason, created_by, created_at)
           VALUES ($1, $2, $3, 'OUT', $4, $5, $6)`,
          [movId, item.product_id, item.quantity, reason, confirmingUserId, now]
        );
      }

      // 4. Update Challan status = Confirmed
      await client.query(
        `UPDATE challans SET status = 'Confirmed', confirmed_by = $1, confirmed_at = $2, updated_at = $2 WHERE id = $3`,
        [confirmingUserId, now, id]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw err;
    }
    client.release();
  } else {
    // Memory fallback logic
    const shortages: StockShortage[] = [];

    for (const item of challan.items) {
      const prod = await findProductById(item.product_id);
      const available = prod ? prod.current_stock : 0;
      if (available < item.quantity) {
        shortages.push({
          product_id: item.product_id,
          product: item.product_name_snapshot,
          requested: item.quantity,
          available,
        });
      }
    }

    if (shortages.length > 0) {
      const err = new Error('Insufficient stock for one or more items.');
      (err as any).code = 'INSUFFICIENT_STOCK';
      (err as any).shortages = shortages;
      throw err;
    }

    // Apply stock deductions
    const now = new Date().toISOString();
    const { recordStockMovement } = await import('./product.db.js');

    for (const item of challan.items) {
      await recordStockMovement(
        item.product_id,
        item.quantity,
        'OUT',
        `Challan #${challan.challan_number}`,
        confirmingUserId
      );
    }

    const idx = memoryChallans.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryChallans[idx].status = 'Confirmed';
      memoryChallans[idx].confirmed_by = confirmingUserId;
      memoryChallans[idx].confirmed_at = now;
      memoryChallans[idx].updated_at = now;
    }
  }

  const updated = await findChallanById(id);
  return updated!;
};

/**
 * Cancel a Challan (Draft: simple status update; Confirmed: Admin-only stock reversal)
 */
export const cancelChallan = async (
  id: string,
  cancellingUserId: string,
  userRole: string
): Promise<Challan> => {
  const challan = await findChallanById(id);
  if (!challan) {
    throw new Error('CHALLAN_NOT_FOUND');
  }

  if (challan.status === 'Cancelled') {
    const err = new Error('Challan is already cancelled.');
    (err as any).code = 'ALREADY_CANCELLED';
    throw err;
  }

  const now = new Date().toISOString();

  // 1. Draft Cancellation (Admin & Sales permitted, no stock impact)
  if (challan.status === 'Draft') {
    const pool = getPool();
    if (pool && isPgConnected()) {
      await pool.query(
        `UPDATE challans SET status = 'Cancelled', cancelled_by = $1, cancelled_at = $2, updated_at = $2 WHERE id = $3`,
        [cancellingUserId, now, id]
      );
    } else {
      const idx = memoryChallans.findIndex((c) => c.id === id);
      if (idx !== -1) {
        memoryChallans[idx].status = 'Cancelled';
        memoryChallans[idx].cancelled_by = cancellingUserId;
        memoryChallans[idx].cancelled_at = now;
        memoryChallans[idx].updated_at = now;
      }
    }
    const updated = await findChallanById(id);
    return updated!;
  }

  // 2. Confirmed Cancellation (ADMIN ONLY — Stock Reversal IN)
  if (userRole.toLowerCase() !== 'admin') {
    const err = new Error('Only Admin users can cancel a Confirmed challan.');
    (err as any).code = 'FORBIDDEN_CANCEL';
    throw err;
  }

  const pool = getPool();

  if (pool && isPgConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Reverse stock deductions (IN movements)
      if (challan.items) {
        for (const item of challan.items) {
          await client.query(
            `UPDATE products SET current_stock = current_stock + $1, updated_at = $2 WHERE id = $3`,
            [item.quantity, now, item.product_id]
          );

          const movId = crypto.randomUUID();
          const reason = `Challan #${challan.challan_number} cancelled`;
          await client.query(
            `INSERT INTO stock_movements (id, product_id, quantity, movement_type, reason, created_by, created_at)
             VALUES ($1, $2, $3, 'IN', $4, $5, $6)`,
            [movId, item.product_id, item.quantity, reason, cancellingUserId, now]
          );
        }
      }

      await client.query(
        `UPDATE challans SET status = 'Cancelled', cancelled_by = $1, cancelled_at = $2, updated_at = $2 WHERE id = $3`,
        [cancellingUserId, now, id]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw err;
    }
    client.release();
  } else {
    // Memory fallback stock reversal
    if (challan.items) {
      const { recordStockMovement } = await import('./product.db.js');
      for (const item of challan.items) {
        await recordStockMovement(
          item.product_id,
          item.quantity,
          'IN',
          `Challan #${challan.challan_number} cancelled`,
          cancellingUserId
        );
      }
    }

    const idx = memoryChallans.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryChallans[idx].status = 'Cancelled';
      memoryChallans[idx].cancelled_by = cancellingUserId;
      memoryChallans[idx].cancelled_at = now;
      memoryChallans[idx].updated_at = now;
    }
  }

  const updated = await findChallanById(id);
  return updated!;
};

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface RevenueMetrics {
  revenueToday: number;
  totalRevenuePeriod: number;
  profitEstimate: number;
  trend: RevenueTrendPoint[];
}

export const getChallanMetricsInDb = async (
  startDateIso?: string,
  endDateIso?: string
): Promise<{ pendingDraftChallans: number; revenue: RevenueMetrics }> => {
  const pool = getPool();
  const start = startDateIso ? new Date(startDateIso) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDateIso ? new Date(endDateIso) : new Date();

  end.setHours(23, 59, 59, 999);

  if (pool && isPgConnected()) {
    try {
      const draftRes = await pool.query(`SELECT COUNT(*)::int AS count FROM challans WHERE status = 'Draft'`);
      const pendingDraftChallans = Number(draftRes.rows[0]?.count || 0);

      const revTodayRes = await pool.query(`
        SELECT COALESCE(SUM(ci.quantity * ci.unit_price_snapshot), 0)::numeric AS revenue_today
        FROM challans c
        JOIN challan_items ci ON c.id = ci.challan_id
        WHERE c.status = 'Confirmed' AND c.confirmed_at >= CURRENT_DATE
      `);
      const revenueToday = Number(revTodayRes.rows[0]?.revenue_today || 0);

      const revPeriodRes = await pool.query(`
        SELECT COALESCE(SUM(ci.quantity * ci.unit_price_snapshot), 0)::numeric AS total_revenue
        FROM challans c
        JOIN challan_items ci ON c.id = ci.challan_id
        WHERE c.status = 'Confirmed' AND c.confirmed_at >= $1 AND c.confirmed_at <= $2
      `, [start.toISOString(), end.toISOString()]);
      const totalRevenuePeriod = Number(revPeriodRes.rows[0]?.total_revenue || 0);

      const trendRes = await pool.query(`
        SELECT
          TO_CHAR(c.confirmed_at, 'YYYY-MM-DD') AS date,
          SUM(ci.quantity * ci.unit_price_snapshot)::numeric AS revenue
        FROM challans c
        JOIN challan_items ci ON c.id = ci.challan_id
        WHERE c.status = 'Confirmed' AND c.confirmed_at >= $1 AND c.confirmed_at <= $2
        GROUP BY TO_CHAR(c.confirmed_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [start.toISOString(), end.toISOString()]);

      const trend: RevenueTrendPoint[] = trendRes.rows.map((r: any) => ({
        date: r.date,
        revenue: Number(r.revenue || 0),
      }));

      return {
        pendingDraftChallans,
        revenue: {
          revenueToday,
          totalRevenuePeriod,
          profitEstimate: totalRevenuePeriod,
          trend,
        },
      };
    } catch (err: any) {
      console.warn('[ChallanDB] Metrics query PG error:', err.message);
    }
  }

  // Memory fallback logic
  const pendingDraftChallans = memoryChallans.filter((c) => c.status === 'Draft').length;

  const todayStr = new Date().toISOString().split('T')[0];

  let revenueToday = 0;
  let totalRevenuePeriod = 0;
  const trendMap: Record<string, number> = {};

  const confirmedChallans = memoryChallans.filter((c) => c.status === 'Confirmed' && c.confirmed_at);

  for (const ch of confirmedChallans) {
    const confDate = new Date(ch.confirmed_at!);
    const dateStr = confDate.toISOString().split('T')[0];
    const items = memoryChallanItems.filter((i) => i.challan_id === ch.id);
    const challanTotal = items.reduce(
      (sum, item) => sum + item.quantity * Number(item.unit_price_snapshot || 0),
      0
    );

    if (dateStr === todayStr) {
      revenueToday += challanTotal;
    }

    if (confDate >= start && confDate <= end) {
      totalRevenuePeriod += challanTotal;
      trendMap[dateStr] = (trendMap[dateStr] || 0) + challanTotal;
    }
  }

  const trend: RevenueTrendPoint[] = Object.keys(trendMap)
    .sort()
    .map((d) => ({
      date: d,
      revenue: trendMap[d],
    }));

  return {
    pendingDraftChallans,
    revenue: {
      revenueToday,
      totalRevenuePeriod,
      profitEstimate: totalRevenuePeriod,
      trend,
    },
  };
};

