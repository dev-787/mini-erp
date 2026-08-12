import crypto from 'crypto';
import { getPool, isPgConnected, findUserById, findUserByEmail } from './index.js';
import {
  Customer,
  CustomerNote,
  CustomerListQueryParams,
  CustomerPaginatedResponse,
  CustomerStatus,
  CustomerType,
} from '../types/customer.js';

// Fallback in-memory data store
const memoryCustomers: Customer[] = [];
const memoryCustomerNotes: CustomerNote[] = [];

/**
 * Initialize customer tables if connected to PostgreSQL
 */
export const initCustomerTables = async (): Promise<void> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          mobile VARCHAR(20) NOT NULL,
          email VARCHAR(255),
          business_name VARCHAR(255),
          gst_number VARCHAR(20),
          customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('Retail','Wholesale','Distributor')),
          address TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead','Active','Inactive')),
          follow_up_date DATE,
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customer_notes (
          id VARCHAR(36) PRIMARY KEY,
          customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          note TEXT NOT NULL,
          created_by VARCHAR(36) NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
      `);
      client.release();
    } catch (err: any) {
      console.warn('[CustomerDB] Error initializing PG tables:', err.message);
    }
  }

  await seedDefaultCustomers();
};

/**
 * Seed realistic sample customers if database is empty
 */
const seedDefaultCustomers = async (): Promise<void> => {
  const existing = await findCustomers({ page: 1, limit: 1 });
  if (existing.total > 0) return;

  const adminUser = await findUserByEmail('admin@example.com');
  const sampleAdminId = adminUser ? adminUser.id : crypto.randomUUID();

  const samples: Array<Omit<Customer, 'id' | 'created_at' | 'updated_at'>> = [
    {
      name: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'rajesh@apextraders.com',
      business_name: 'Apex Wholesale Traders',
      gst_number: '27AABCU9603R1ZM',
      customer_type: 'Wholesale',
      address: '102 Industrial Area, Sector 5, Mumbai',
      status: 'Active',
      follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      created_by: sampleAdminId,
    },
    {
      name: 'Priya Sharma',
      mobile: '+919811223344',
      email: 'priya@skylinecorp.in',
      business_name: 'Skyline Distributors',
      gst_number: '07AAACS1428L1Z2',
      customer_type: 'Distributor',
      address: 'Plot 45, Okhla Phase III, New Delhi',
      status: 'Active',
      follow_up_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      created_by: sampleAdminId,
    },
    {
      name: 'Amit Patel',
      mobile: '+919723456789',
      email: 'amit@metroretail.com',
      business_name: 'Metro Retail Outlets',
      gst_number: '24AAACM1234A1Z5',
      customer_type: 'Retail',
      address: 'Shop 12, Commercial Hub, Ahmedabad',
      status: 'Lead',
      follow_up_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
      created_by: sampleAdminId,
    },
    {
      name: 'Suresh Menon',
      mobile: '+919447012345',
      email: 'suresh@keralatrading.com',
      business_name: 'Kerala Goods Supply',
      gst_number: '32AABCK5678B1Z9',
      customer_type: 'Wholesale',
      address: 'MG Road, Ernakulam, Kochi',
      status: 'Inactive',
      follow_up_date: null,
      created_by: sampleAdminId,
    },
  ];

  for (const sample of samples) {
    const newCust = await insertCustomer(sample);
    if (newCust && sample.status === 'Active') {
      await insertCustomerNote({
        customer_id: newCust.id,
        note: 'Initial onboarding meeting completed. Business terms agreed.',
        created_by: sampleAdminId,
      });
    }
  }
};

/**
 * List customers with pagination, search, and status/type filters
 */
export const findCustomers = async (
  params: CustomerListQueryParams
): Promise<CustomerPaginatedResponse> => {
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
        whereClauses.push(
          `(name ILIKE $${valIndex} OR business_name ILIKE $${valIndex} OR mobile ILIKE $${valIndex})`
        );
        values.push(`%${params.search}%`);
        valIndex++;
      }

      if (params.status) {
        whereClauses.push(`status = $${valIndex}`);
        values.push(params.status);
        valIndex++;
      }

      if (params.customer_type) {
        whereClauses.push(`customer_type = $${valIndex}`);
        values.push(params.customer_type);
        valIndex++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM customers ${whereSql}`,
        values
      );
      const total = countResult.rows[0]?.total || 0;

      const dataResult = await pool.query(
        `SELECT * FROM customers ${whereSql} ORDER BY created_at DESC LIMIT $${valIndex} OFFSET $${valIndex + 1}`,
        [...values, limit, offset]
      );

      return {
        data: dataResult.rows,
        total,
        page,
        limit,
      };
    } catch (err: any) {
      console.warn('[CustomerDB] PG query error, fallback to memory:', err.message);
    }
  }

  // Fallback memory database logic
  let filtered = [...memoryCustomers];

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.business_name && c.business_name.toLowerCase().includes(s)) ||
        c.mobile.includes(s)
    );
  }

  if (params.status) {
    filtered = filtered.filter((c) => c.status === params.status);
  }

  if (params.customer_type) {
    filtered = filtered.filter((c) => c.customer_type === params.customer_type);
  }

  const total = filtered.length;
  const paginatedData = filtered.slice(offset, offset + limit);

  return {
    data: paginatedData,
    total,
    page,
    limit,
  };
};

/**
 * Get customer by ID
 */
export const findCustomerById = async (id: string): Promise<Customer | null> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const res = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.warn('[CustomerDB] PG query error:', err.message);
    }
  }

  return memoryCustomers.find((c) => c.id === id) || null;
};

/**
 * Insert new customer
 */
export const insertCustomer = async (
  data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
): Promise<Customer> => {
  const now = new Date().toISOString();
  const newCustomer: Customer = {
    id: crypto.randomUUID(),
    name: data.name,
    mobile: data.mobile,
    email: data.email || null,
    business_name: data.business_name || null,
    gst_number: data.gst_number || null,
    customer_type: data.customer_type,
    address: data.address || null,
    status: data.status || 'Lead',
    follow_up_date: data.follow_up_date || null,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const query = `
        INSERT INTO customers (
          id, name, mobile, email, business_name, gst_number,
          customer_type, address, status, follow_up_date, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const values = [
        newCustomer.id,
        newCustomer.name,
        newCustomer.mobile,
        newCustomer.email,
        newCustomer.business_name,
        newCustomer.gst_number,
        newCustomer.customer_type,
        newCustomer.address,
        newCustomer.status,
        newCustomer.follow_up_date,
        newCustomer.created_by,
        newCustomer.created_at,
        newCustomer.updated_at,
      ];
      const res = await pool.query(query, values);
      return res.rows[0];
    } catch (err: any) {
      console.warn('[CustomerDB] PG insert error, using memory store:', err.message);
    }
  }

  memoryCustomers.unshift(newCustomer);
  return newCustomer;
};

/**
 * Partial update of customer
 */
export const updateCustomer = async (
  id: string,
  updates: Partial<Customer>
): Promise<Customer | null> => {
  const existing = await findCustomerById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const setClauses: string[] = ['updated_at = $1'];
      const values: any[] = [now];
      let valIdx = 2;

      const allowedFields: Array<keyof Customer> = [
        'name',
        'mobile',
        'email',
        'business_name',
        'gst_number',
        'customer_type',
        'address',
        'status',
        'follow_up_date',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${valIdx}`);
          values.push(updates[field]);
          valIdx++;
        }
      }

      values.push(id);
      const query = `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${valIdx} RETURNING *`;
      const res = await pool.query(query, values);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.warn('[CustomerDB] PG update error, using memory store:', err.message);
    }
  }

  // Memory update
  const idx = memoryCustomers.findIndex((c) => c.id === id);
  if (idx !== -1) {
    memoryCustomers[idx] = {
      ...memoryCustomers[idx],
      ...updates,
      updated_at: now,
    };
    return memoryCustomers[idx];
  }

  return null;
};

/**
 * Get follow-up notes for a customer (newest first), with author name resolved
 */
export const findCustomerNotes = async (customerId: string): Promise<CustomerNote[]> => {
  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const query = `
        SELECT cn.*, u.name AS created_by_name
        FROM customer_notes cn
        LEFT JOIN users u ON cn.created_by = u.id
        WHERE cn.customer_id = $1
        ORDER BY cn.created_at DESC
      `;
      const res = await pool.query(query, [customerId]);
      return res.rows;
    } catch (err: any) {
      console.warn('[CustomerDB] PG notes query error:', err.message);
    }
  }

  const notes = memoryCustomerNotes
    .filter((n) => n.customer_id === customerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Resolve author names for memory notes
  const notesWithNames = await Promise.all(
    notes.map(async (n) => {
      if (n.created_by_name) return n;
      const user = await findUserById(n.created_by);
      return {
        ...n,
        created_by_name: user?.name || 'System User',
      };
    })
  );

  return notesWithNames;
};

/**
 * Insert follow-up note
 */
export const insertCustomerNote = async (
  data: Omit<CustomerNote, 'id' | 'created_at' | 'created_by_name'>
): Promise<CustomerNote> => {
  const now = new Date().toISOString();
  const authorUser = await findUserById(data.created_by);

  const newNote: CustomerNote = {
    id: crypto.randomUUID(),
    customer_id: data.customer_id,
    note: data.note,
    created_by: data.created_by,
    created_by_name: authorUser?.name || 'System User',
    created_at: now,
  };

  const pool = getPool();
  if (pool && isPgConnected()) {
    try {
      const query = `
        INSERT INTO customer_notes (id, customer_id, note, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [newNote.id, newNote.customer_id, newNote.note, newNote.created_by, newNote.created_at];
      const res = await pool.query(query, values);
      return {
        ...res.rows[0],
        created_by_name: authorUser?.name || 'System User',
      };
    } catch (err: any) {
      console.warn('[CustomerDB] PG note insert error, using memory store:', err.message);
    }
  }

  memoryCustomerNotes.unshift(newNote);
  return newNote;
};

export interface CustomerMetrics {
  total: number;
  followUpsDueToday: number;
  byStatus: {
    Lead: number;
    Active: number;
    Inactive: number;
  };
}

export const getCustomerMetricsInDb = async (): Promise<CustomerMetrics> => {
  const pool = getPool();
  const todayStr = new Date().toISOString().split('T')[0];

  if (pool && isPgConnected()) {
    try {
      const aggRes = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN follow_up_date = CURRENT_DATE THEN 1 END)::int AS follow_ups_due_today,
          COUNT(CASE WHEN status = 'Lead' THEN 1 END)::int AS lead_count,
          COUNT(CASE WHEN status = 'Active' THEN 1 END)::int AS active_count,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END)::int AS inactive_count
        FROM customers
      `);
      const row = aggRes.rows[0] || {};
      return {
        total: Number(row.total || 0),
        followUpsDueToday: Number(row.follow_ups_due_today || 0),
        byStatus: {
          Lead: Number(row.lead_count || 0),
          Active: Number(row.active_count || 0),
          Inactive: Number(row.inactive_count || 0),
        },
      };
    } catch (err: any) {
      console.warn('[CustomerDB] Customer metrics PG query error:', err.message);
    }
  }

  // Memory fallback
  const total = memoryCustomers.length;
  const followUpsDueToday = memoryCustomers.filter(c => c.follow_up_date && c.follow_up_date.startsWith(todayStr)).length;
  const lead_count = memoryCustomers.filter(c => c.status === 'Lead').length;
  const active_count = memoryCustomers.filter(c => c.status === 'Active').length;
  const inactive_count = memoryCustomers.filter(c => c.status === 'Inactive').length;

  return {
    total,
    followUpsDueToday,
    byStatus: {
      Lead: lead_count,
      Active: active_count,
      Inactive: inactive_count,
    },
  };
};

