import crypto from 'crypto';
import { getPool, isPgConnected, findUserByEmail, findUserById } from './index.js';
import {
  Product,
  StockMovement,
  MovementType,
  ProductListQueryParams,
  ProductPaginatedResponse,
} from '../types/product.js';

// Fallback in-memory data store
const memoryProducts: Product[] = [];
const memoryStockMovements: StockMovement[] = [];

/**
 * Initialize product & stock movement tables if connected to PostgreSQL
 */
export const initProductTables = async (): Promise<void> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(50) UNIQUE NOT NULL,
          category VARCHAR(100),
          unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
          current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
          min_stock_alert INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
          location VARCHAR(100),
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stock_movements (
          id VARCHAR(36) PRIMARY KEY,
          product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN','OUT')),
          reason VARCHAR(255) NOT NULL,
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
      `);
      client.release();
    } catch (err: any) {
      console.warn('[ProductDB] Error initializing PG tables:', err.message);
    }
  }

  await seedDefaultProducts();
};

/**
 * Seed sample products & initial stock logs if database is empty
 */
const seedDefaultProducts = async (): Promise<void> => {
  const existing = await findProducts({ page: 1, limit: 1 });
  if (existing.total > 0) return;

  const adminUser = await findUserByEmail('admin@example.com');
  const adminId = adminUser ? adminUser.id : crypto.randomUUID();

  const samples = [
    {
      name: 'Industrial Steel Wire 5mm',
      sku: 'SKU-ST-500',
      category: 'Raw Materials',
      unit_price: 450.00,
      current_stock: 120,
      min_stock_alert: 50,
      location: 'Rack A-12, Godown 1',
      created_by: adminId,
    },
    {
      name: 'Brass Pipe Fittings 1/2 Inch',
      sku: 'SKU-BR-102',
      category: 'Hardware',
      unit_price: 85.50,
      current_stock: 8,
      min_stock_alert: 25, // Low Stock!
      location: 'Bin B-04, Warehouse 2',
      created_by: adminId,
    },
    {
      name: 'Polypropylene Granules Grade-A',
      sku: 'SKU-PP-900',
      category: 'Plastics',
      unit_price: 1200.00,
      current_stock: 350,
      min_stock_alert: 100,
      location: 'Silo 3, Chemical Shed',
      created_by: adminId,
    },
    {
      name: 'Heavy Duty Corrugated Box 5-Ply',
      sku: 'SKU-BX-550',
      category: 'Packaging',
      unit_price: 32.00,
      current_stock: 5,
      min_stock_alert: 50, // Low Stock!
      location: 'Shelf C-01, Packing Bay',
      created_by: adminId,
    },
  ];

  for (const sample of samples) {
    const newProd = await insertProduct(sample);
    if (newProd && newProd.current_stock > 0) {
      await insertStockMovementRecord({
        product_id: newProd.id,
        quantity: newProd.current_stock,
        movement_type: 'IN',
        reason: 'Initial Opening Stock',
        created_by: adminId,
      });
    }
  }
};

/**
 * Helper to compute is_low_stock
 */
const mapProductWithAlert = (p: any): Product => ({
  ...p,
  unit_price: Number(p.unit_price),
  current_stock: Number(p.current_stock),
  min_stock_alert: Number(p.min_stock_alert),
  is_low_stock: Number(p.current_stock) <= Number(p.min_stock_alert),
});

/**
 * List products with pagination, search, category filter, and low_stock toggle
 */
export const findProducts = async (
  params: ProductListQueryParams
): Promise<ProductPaginatedResponse> => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
  const offset = (page - 1) * limit;

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const whereClauses: string[] = [];
      const values: any[] = [];
      let valIndex = 1;

      if (params.search) {
        whereClauses.push(`(name ILIKE $${valIndex} OR sku ILIKE $${valIndex})`);
        values.push(`%${params.search}%`);
        valIndex++;
      }

      if (params.category) {
        whereClauses.push(`category = $${valIndex}`);
        values.push(params.category);
        valIndex++;
      }

      if (params.low_stock) {
        whereClauses.push(`current_stock <= min_stock_alert`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM products ${whereSql}`,
        values
      );
      const total = countResult.rows[0]?.total || 0;

      const dataResult = await pool.query(
        `SELECT * FROM products ${whereSql} ORDER BY created_at DESC LIMIT $${valIndex} OFFSET $${valIndex + 1}`,
        [...values, limit, offset]
      );

      return {
        data: dataResult.rows.map(mapProductWithAlert),
        total,
        page,
        limit,
      };
    } catch (err: any) {
      console.warn('[ProductDB] PG query error, fallback to memory:', err.message);
    }
  }

  // Fallback memory logic
  let filtered = [...memoryProducts];

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }

  if (params.category) {
    filtered = filtered.filter((p) => p.category === params.category);
  }

  if (params.low_stock) {
    filtered = filtered.filter((p) => p.current_stock <= p.min_stock_alert);
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit).map(mapProductWithAlert);

  return {
    data: paginated,
    total,
    page,
    limit,
  };
};

/**
 * Get product by ID
 */
export const findProductById = async (id: string): Promise<Product | null> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (res.rows.length > 0) return mapProductWithAlert(res.rows[0]);
    } catch (err: any) {
      console.warn('[ProductDB] PG query error:', err.message);
    }
  }

  const p = memoryProducts.find((item) => item.id === id);
  return p ? mapProductWithAlert(p) : null;
};

/**
 * Get product by SKU
 */
export const findProductBySku = async (sku: string): Promise<Product | null> => {
  const cleanSku = sku.trim().toUpperCase();
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const res = await pool.query('SELECT * FROM products WHERE UPPER(sku) = $1', [cleanSku]);
      if (res.rows.length > 0) return mapProductWithAlert(res.rows[0]);
    } catch (err: any) {
      console.warn('[ProductDB] PG query error:', err.message);
    }
  }

  const p = memoryProducts.find((item) => item.sku.toUpperCase() === cleanSku);
  return p ? mapProductWithAlert(p) : null;
};

/**
 * Insert new product
 */
export const insertProduct = async (
  data: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product> => {
  const now = new Date().toISOString();
  const newProd: Product = {
    id: crypto.randomUUID(),
    name: data.name,
    sku: data.sku.toUpperCase(),
    category: data.category || null,
    unit_price: Number(data.unit_price),
    current_stock: Math.max(0, Number(data.current_stock) || 0),
    min_stock_alert: Math.max(0, Number(data.min_stock_alert) || 0),
    location: data.location || null,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const query = `
        INSERT INTO products (
          id, name, sku, category, unit_price, current_stock, min_stock_alert, location, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const values = [
        newProd.id,
        newProd.name,
        newProd.sku,
        newProd.category,
        newProd.unit_price,
        newProd.current_stock,
        newProd.min_stock_alert,
        newProd.location,
        newProd.created_by,
        newProd.created_at,
        newProd.updated_at,
      ];
      const res = await pool.query(query, values);
      return mapProductWithAlert(res.rows[0]);
    } catch (err: any) {
      console.warn('[ProductDB] PG insert error, using memory store:', err.message);
    }
  }

  memoryProducts.unshift(newProd);
  return mapProductWithAlert(newProd);
};

/**
 * Partial update of product (current_stock is NOT editable here)
 */
export const updateProduct = async (
  id: string,
  updates: Partial<Omit<Product, 'current_stock'>>
): Promise<Product | null> => {
  const existing = await findProductById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const setClauses: string[] = ['updated_at = $1'];
      const values: any[] = [now];
      let valIdx = 2;

      const allowedFields: Array<keyof Product> = [
        'name',
        'category',
        'unit_price',
        'min_stock_alert',
        'location',
      ];

      for (const field of allowedFields) {
        if ((updates as any)[field] !== undefined) {
          setClauses.push(`${field} = $${valIdx}`);
          values.push((updates as any)[field]);
          valIdx++;
        }
      }

      values.push(id);
      const query = `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${valIdx} RETURNING *`;
      const res = await pool.query(query, values);
      if (res.rows.length > 0) return mapProductWithAlert(res.rows[0]);
    } catch (err: any) {
      console.warn('[ProductDB] PG update error, using memory store:', err.message);
    }
  }

  const idx = memoryProducts.findIndex((p) => p.id === id);
  if (idx !== -1) {
    const { current_stock, ...validUpdates } = updates as any;
    memoryProducts[idx] = {
      ...memoryProducts[idx],
      ...validUpdates,
      updated_at: now,
    };
    return mapProductWithAlert(memoryProducts[idx]);
  }

  return null;
};

/**
 * Get paginated stock movements for a product (newest first)
 */
export const findStockMovements = async (
  productId: string,
  page = 1,
  limit = 20
): Promise<{ data: StockMovement[]; total: number }> => {
  const offset = (page - 1) * limit;
  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const countRes = await pool.query(
        'SELECT COUNT(*)::int AS total FROM stock_movements WHERE product_id = $1',
        [productId]
      );
      const total = countRes.rows[0]?.total || 0;

      const query = `
        SELECT sm.*, u.name AS created_by_name
        FROM stock_movements sm
        LEFT JOIN users u ON sm.created_by = u.id
        WHERE sm.product_id = $1
        ORDER BY sm.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const res = await pool.query(query, [productId, limit, offset]);

      return {
        data: res.rows,
        total,
      };
    } catch (err: any) {
      console.warn('[ProductDB] PG stock movements query error:', err.message);
    }
  }

  const filtered = memoryStockMovements
    .filter((m) => m.product_id === productId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const resolved = await Promise.all(
    paginated.map(async (m) => {
      if (m.created_by_name) return m;
      const user = await findUserById(m.created_by);
      return {
        ...m,
        created_by_name: user?.name || 'System User',
      };
    })
  );

  return {
    data: resolved,
    total,
  };
};

/**
 * Insert stock movement record helper
 */
const insertStockMovementRecord = async (
  movementData: Omit<StockMovement, 'id' | 'created_at' | 'created_by_name'>
): Promise<StockMovement> => {
  const now = new Date().toISOString();
  const authorUser = await findUserById(movementData.created_by);

  const newMov: StockMovement = {
    id: crypto.randomUUID(),
    product_id: movementData.product_id,
    quantity: movementData.quantity,
    movement_type: movementData.movement_type,
    reason: movementData.reason,
    created_by: movementData.created_by,
    created_by_name: authorUser?.name || 'System User',
    created_at: now,
  };

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const query = `
        INSERT INTO stock_movements (id, product_id, quantity, movement_type, reason, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [newMov.id, newMov.product_id, newMov.quantity, newMov.movement_type, newMov.reason, newMov.created_by, newMov.created_at];
      const res = await pool.query(query, values);
      return {
        ...res.rows[0],
        created_by_name: authorUser?.name || 'System User',
      };
    } catch (err: any) {
      console.warn('[ProductDB] PG stock movement insert error:', err.message);
    }
  }

  memoryStockMovements.unshift(newMov);
  return newMov;
};

/**
 * Record a stock movement IN or OUT atomically inside a single DB transaction
 */
export const recordStockMovement = async (
  productId: string,
  quantity: number,
  movementType: MovementType,
  reason: string,
  createdBy: string
): Promise<{ product: Product; movement: StockMovement }> => {
  const pool = getPool();

  if (pool && isPgConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock & fetch product row
      const prodRes = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const product = prodRes.rows[0];
      const currentStock = Number(product.current_stock);

      // 2. Insufficient stock check for OUT
      if (movementType === 'OUT' && currentStock < quantity) {
        await client.query('ROLLBACK');
        const err = new Error(`Insufficient stock: only ${currentStock} units available`);
        (err as any).code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      // 3. Compute new stock
      const newStock = movementType === 'IN' ? currentStock + quantity : currentStock - quantity;
      const now = new Date().toISOString();

      // 4. Update product current_stock
      const updateRes = await client.query(
        'UPDATE products SET current_stock = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [newStock, now, productId]
      );

      // 5. Insert movement log
      const movId = crypto.randomUUID();
      const movRes = await client.query(
        `INSERT INTO stock_movements (id, product_id, quantity, movement_type, reason, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [movId, productId, quantity, movementType, reason, createdBy, now]
      );

      await client.query('COMMIT');

      const authorUser = await findUserById(createdBy);

      return {
        product: mapProductWithAlert(updateRes.rows[0]),
        movement: {
          ...movRes.rows[0],
          created_by_name: authorUser?.name || 'System User',
        },
      };
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Memory fallback transaction logic
  const product = memoryProducts.find((p) => p.id === productId);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  if (movementType === 'OUT' && product.current_stock < quantity) {
    const err = new Error(`Insufficient stock: only ${product.current_stock} units available`);
    (err as any).code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const now = new Date().toISOString();
  product.current_stock = movementType === 'IN' ? product.current_stock + quantity : product.current_stock - quantity;
  product.updated_at = now;

  const movement = await insertStockMovementRecord({
    product_id: productId,
    quantity,
    movement_type: movementType,
    reason,
    created_by: createdBy,
  });

  return {
    product: mapProductWithAlert(product),
    movement,
  };
};

/**
 * Get all low-stock products (current_stock <= min_stock_alert)
 */
export const findLowStockProducts = async (): Promise<Product[]> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const res = await pool.query(
        'SELECT * FROM products WHERE current_stock <= min_stock_alert ORDER BY current_stock ASC'
      );
      return res.rows.map(mapProductWithAlert);
    } catch (err: any) {
      console.warn('[ProductDB] Low stock PG query error:', err.message);
    }
  }

  return memoryProducts
    .filter((p) => p.current_stock <= p.min_stock_alert)
    .sort((a, b) => a.current_stock - b.current_stock)
    .map(mapProductWithAlert);
};

/**
 * Get aggregate summary stats for top-of-page inventory cards
 */
export const getInventorySummary = async (): Promise<{
  totalInventoryValue: number;
  totalProducts: number;
  lowStockCount: number;
  todayMovementsIn: number;
  todayMovementsOut: number;
}> => {
  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const prodAggRes = await pool.query(`
        SELECT
          COALESCE(SUM(current_stock * unit_price), 0)::numeric AS total_inventory_value,
          COUNT(*)::int AS total_products,
          COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END)::int AS low_stock_count
        FROM products
      `);

      const movAggRes = await pool.query(`
        SELECT
          COUNT(CASE WHEN movement_type = 'IN' THEN 1 END)::int AS today_movements_in,
          COUNT(CASE WHEN movement_type = 'OUT' THEN 1 END)::int AS today_movements_out
        FROM stock_movements
        WHERE created_at >= CURRENT_DATE
      `);

      const prodRow = prodAggRes.rows[0] || {};
      const movRow = movAggRes.rows[0] || {};

      return {
        totalInventoryValue: Number(prodRow.total_inventory_value || 0),
        totalProducts: Number(prodRow.total_products || 0),
        lowStockCount: Number(prodRow.low_stock_count || 0),
        todayMovementsIn: Number(movRow.today_movements_in || 0),
        todayMovementsOut: Number(movRow.today_movements_out || 0),
      };
    } catch (err: any) {
      console.warn('[ProductDB] Inventory summary PG query error:', err.message);
    }
  }

  // Memory fallback logic
  const totalInventoryValue = memoryProducts.reduce(
    (sum, p) => sum + p.current_stock * p.unit_price,
    0
  );
  const totalProducts = memoryProducts.length;
  const lowStockCount = memoryProducts.filter((p) => p.current_stock <= p.min_stock_alert).length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayMovements = memoryStockMovements.filter(
    (m) => new Date(m.created_at).getTime() >= startOfToday.getTime()
  );

  const todayMovementsIn = todayMovements.filter((m) => m.movement_type === 'IN').length;
  const todayMovementsOut = todayMovements.filter((m) => m.movement_type === 'OUT').length;

  return {
    totalInventoryValue,
    totalProducts,
    lowStockCount,
    todayMovementsIn,
    todayMovementsOut,
  };
};

export interface GlobalStockMovementQueryParams {
  page?: number;
  limit?: number;
  product_id?: string;
  movement_type?: 'IN' | 'OUT';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface GlobalStockMovementItem extends StockMovement {
  product_name: string;
  product_sku: string;
}

/**
 * Get cross-product global stock movement audit ledger
 */
export const findGlobalStockMovements = async (
  params: GlobalStockMovementQueryParams
): Promise<{
  data: GlobalStockMovementItem[];
  total: number;
  page: number;
  limit: number;
}> => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  const pool = getPool();

  if (pool && isPgConnected()) {
    try {
      const whereClauses: string[] = [];
      const values: any[] = [];
      let valIdx = 1;

      if (params.product_id) {
        whereClauses.push(`sm.product_id = $${valIdx}`);
        values.push(params.product_id);
        valIdx++;
      }

      if (params.movement_type) {
        whereClauses.push(`sm.movement_type = $${valIdx}`);
        values.push(params.movement_type);
        valIdx++;
      }

      if (params.date_from) {
        whereClauses.push(`sm.created_at >= $${valIdx}`);
        values.push(params.date_from);
        valIdx++;
      }

      if (params.date_to) {
        whereClauses.push(`sm.created_at <= $${valIdx}`);
        values.push(params.date_to);
        valIdx++;
      }

      if (params.search) {
        whereClauses.push(`(p.name ILIKE $${valIdx} OR p.sku ILIKE $${valIdx} OR sm.reason ILIKE $${valIdx})`);
        values.push(`%${params.search}%`);
        valIdx++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         ${whereSql}`,
        values
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await pool.query(
        `SELECT
           sm.id,
           sm.product_id,
           p.name AS product_name,
           p.sku AS product_sku,
           sm.quantity,
           sm.movement_type,
           sm.reason,
           sm.created_by,
           u.name AS created_by_name,
           sm.created_at
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         LEFT JOIN users u ON sm.created_by = u.id
         ${whereSql}
         ORDER BY sm.created_at DESC
         LIMIT $${valIdx} OFFSET $${valIdx + 1}`,
        [...values, limit, offset]
      );

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
      };
    } catch (err: any) {
      console.warn('[ProductDB] Global stock movements PG error:', err.message);
    }
  }

  // Memory fallback logic
  let filtered = memoryStockMovements.map((sm) => {
    const prod = memoryProducts.find((p) => p.id === sm.product_id);
    return {
      ...sm,
      product_name: prod ? prod.name : 'Unknown Product',
      product_sku: prod ? prod.sku : 'SKU-000',
    };
  });

  if (params.product_id) {
    filtered = filtered.filter((sm) => sm.product_id === params.product_id);
  }

  if (params.movement_type) {
    filtered = filtered.filter((sm) => sm.movement_type === params.movement_type);
  }

  if (params.date_from) {
    const from = new Date(params.date_from).getTime();
    filtered = filtered.filter((sm) => new Date(sm.created_at).getTime() >= from);
  }

  if (params.date_to) {
    const to = new Date(params.date_to).getTime();
    filtered = filtered.filter((sm) => new Date(sm.created_at).getTime() <= to);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (sm) =>
        sm.product_name.toLowerCase().includes(s) ||
        sm.product_sku.toLowerCase().includes(s) ||
        sm.reason.toLowerCase().includes(s)
    );
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const resolved = await Promise.all(
    paginated.map(async (sm) => {
      if (sm.created_by_name) return sm;
      const user = await findUserById(sm.created_by);
      return {
        ...sm,
        created_by_name: user?.name || 'System User',
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

