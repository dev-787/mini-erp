import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { User, Invite, Session, SafeUser, InviteResponse, SafeSession, UserRole, InviteStatus } from '../types/auth.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isPgConnectedFlag = false;

export const getPool = () => pool;
export const isPgConnected = () => isPgConnectedFlag;

// Fallback in-memory data store if PostgreSQL service is not reachable locally
const memoryDb: {
  users: User[];
  invites: Invite[];
  sessions: Session[];
} = {
  users: [],
  invites: [],
  sessions: [],
};

if (config.databaseUrl) {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  } catch (err: any) {
    console.warn('[DB] Failed to create PG pool, using embedded DB engine:', err.message);
  }
}

export const initDb = async (): Promise<void> => {
  if (pool) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounts')),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invites (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounts')),
          token_hash TEXT NOT NULL,
          invited_by VARCHAR(36) NOT NULL REFERENCES users(id),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id),
          refresh_token_hash TEXT NOT NULL,
          user_agent TEXT,
          ip_address VARCHAR(45),
          revoked BOOLEAN DEFAULT false,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      client.release();
      isPgConnectedFlag = true;
      console.log('[DB] PostgreSQL database initialized successfully.');
    } catch (err: any) {
      console.warn('[DB] Could not connect to PostgreSQL. Using embedded memory store fallback:', err.message);
      isPgConnectedFlag = false;
    }
  }

  // Seed default admin and sample accounts if empty
  await seedDefaultUsers();

  // Initialize Customer CRM tables
  const { initCustomerTables } = await import('./customer.db.js');
  await initCustomerTables();

  // Initialize Product & Inventory tables
  const { initProductTables } = await import('./product.db.js');
  await initProductTables();

  // Initialize Sales Challan tables
  const { initChallanTables } = await import('./challan.db.js');
  await initChallanTables();
};

const seedDefaultUsers = async (): Promise<void> => {
  const adminEmail = 'admin@example.com';
  const existingAdmin = await findUserByEmail(adminEmail);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser: User = {
      id: crypto.randomUUID(),
      name: 'System Admin',
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await insertUser(adminUser);
    console.log('[DB Seed] Created default admin account: admin@example.com / Admin@123');

    const defaultRoles: Array<{ email: string; name: string; role: UserRole; pass: string }> = [
      { email: 'sales@example.com', name: 'Sales Representative', role: 'sales', pass: 'Sales@123' },
      { email: 'warehouse@example.com', name: 'Warehouse Manager', role: 'warehouse', pass: 'Warehouse@123' },
      { email: 'accounts@example.com', name: 'Accounts Officer', role: 'accounts', pass: 'Accounts@123' },
    ];

    for (const item of defaultRoles) {
      const pHash = await bcrypt.hash(item.pass, 10);
      await insertUser({
        id: crypto.randomUUID(),
        name: item.name,
        email: item.email,
        password_hash: pHash,
        role: item.role,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    console.log('[DB Seed] Created default demo role accounts (Sales, Warehouse, Accounts)');
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const normEmail = email.toLowerCase().trim();
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<User>('SELECT * FROM users WHERE LOWER(email) = $1', [normEmail]);
    return res.rows[0] || null;
  }
  return memoryDb.users.find(u => u.email.toLowerCase() === normEmail) || null;
};

export const findUserById = async (id: string): Promise<SafeUser | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<SafeUser>('SELECT id, name, email, role, status, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  const u = memoryDb.users.find(u => u.id === id);
  if (!u) return null;
  const { password_hash, updated_at, ...safe } = u;
  return safe;
};

export const insertUser = async (user: User): Promise<User> => {
  if (isPgConnectedFlag && pool) {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user.id, user.name, user.email, user.password_hash, user.role, user.status || 'active', user.created_at, user.updated_at]
    );
    return user;
  }
  memoryDb.users.push(user);
  return user;
};

// Sessions
export const createSession = async (session: Session): Promise<Session> => {
  if (isPgConnectedFlag && pool) {
    await pool.query(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, revoked, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session.id, session.user_id, session.refresh_token_hash, session.user_agent, session.ip_address, session.revoked, session.expires_at, session.created_at]
    );
    return session;
  }
  memoryDb.sessions.push(session);
  return session;
};

export const findSessionByTokenHash = async (tokenHash: string): Promise<Session | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<Session>('SELECT * FROM sessions WHERE refresh_token_hash = $1', [tokenHash]);
    return res.rows[0] || null;
  }
  return memoryDb.sessions.find(s => s.refresh_token_hash === tokenHash) || null;
};

export const revokeSessionById = async (sessionId: string): Promise<void> => {
  if (isPgConnectedFlag && pool) {
    await pool.query('UPDATE sessions SET revoked = true WHERE id = $1', [sessionId]);
    return;
  }
  const sess = memoryDb.sessions.find(s => s.id === sessionId);
  if (sess) sess.revoked = true;
};

export const revokeSessionByTokenHash = async (tokenHash: string): Promise<void> => {
  if (isPgConnectedFlag && pool) {
    await pool.query('UPDATE sessions SET revoked = true WHERE refresh_token_hash = $1', [tokenHash]);
    return;
  }
  const sess = memoryDb.sessions.find(s => s.refresh_token_hash === tokenHash);
  if (sess) sess.revoked = true;
};

export const getUserSessions = async (userId: string): Promise<SafeSession[]> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<SafeSession>(
      'SELECT id, user_agent, ip_address, revoked, expires_at, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows;
  }
  return memoryDb.sessions
    .filter(s => s.user_id === userId)
    .map(({ refresh_token_hash, user_id, ...rest }) => rest)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// Invites
export const createInvite = async (invite: Invite): Promise<Invite> => {
  if (isPgConnectedFlag && pool) {
    await pool.query(
      `INSERT INTO invites (id, email, role, token_hash, invited_by, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [invite.id, invite.email, invite.role, invite.token_hash, invite.invited_by, invite.status, invite.expires_at, invite.created_at]
    );
    return invite;
  }
  memoryDb.invites.push(invite);
  return invite;
};

export const findInviteByTokenHash = async (tokenHash: string): Promise<Invite | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<Invite>('SELECT * FROM invites WHERE token_hash = $1', [tokenHash]);
    return res.rows[0] || null;
  }
  return memoryDb.invites.find(i => i.token_hash === tokenHash) || null;
};

export const updateInviteStatus = async (inviteId: string, status: InviteStatus): Promise<void> => {
  if (isPgConnectedFlag && pool) {
    await pool.query('UPDATE invites SET status = $1 WHERE id = $2', [status, inviteId]);
    return;
  }
  const inv = memoryDb.invites.find(i => i.id === inviteId);
  if (inv) inv.status = status;
};

export const getAllInvites = async (): Promise<InviteResponse[]> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<InviteResponse>(`
      SELECT i.id, i.email, i.role, i.status, i.expires_at, i.created_at, u.name as invited_by_name
      FROM invites i
      LEFT JOIN users u ON i.invited_by = u.id
      ORDER BY i.created_at DESC
    `);
    return res.rows;
  }

  const now = new Date();
  return memoryDb.invites.map(i => {
    let currentStatus = i.status;
    if (currentStatus === 'pending' && new Date(i.expires_at) < now) {
      currentStatus = 'expired';
      i.status = 'expired';
    }
    const inviter = memoryDb.users.find(u => u.id === i.invited_by);
    return {
      id: i.id,
      email: i.email,
      role: i.role,
      status: currentStatus,
      expires_at: i.expires_at,
      created_at: i.created_at,
      invited_by_name: inviter ? inviter.name : 'Admin',
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getInviteById = async (id: string): Promise<Invite | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<Invite>('SELECT * FROM invites WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return memoryDb.invites.find(i => i.id === id) || null;
};

export const getAllUsers = async (filters?: { search?: string; role?: string; status?: string }): Promise<SafeUser[]> => {
  const { search, role, status } = filters || {};
  if (isPgConnectedFlag && pool) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
    }

    if (role) {
      params.push(role.toLowerCase());
      conditions.push(`LOWER(role) = $${params.length}`);
    }

    if (status) {
      params.push(status.toLowerCase());
      conditions.push(`LOWER(status) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT id, name, email, role, status, created_at FROM users ${whereClause} ORDER BY created_at DESC`;
    const res = await pool.query<SafeUser>(query, params);
    return res.rows;
  }

  let result: SafeUser[] = memoryDb.users.map(({ id, name, email, role, status, created_at }) => ({
    id,
    name,
    email,
    role,
    status: status || 'active',
    created_at,
  }));

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  if (role) {
    const r = role.toLowerCase();
    result = result.filter(u => u.role.toLowerCase() === r);
  }

  if (status) {
    const s = status.toLowerCase();
    result = result.filter(u => u.status.toLowerCase() === s);
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const updateUserStatus = async (id: string, status: UserStatus): Promise<SafeUser | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<SafeUser>(
      `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status, created_at`,
      [status, id]
    );
    return res.rows[0] || null;
  }

  const u = memoryDb.users.find(u => u.id === id);
  if (!u) return null;
  u.status = status;
  u.updated_at = new Date().toISOString();
  const { password_hash, updated_at, ...safe } = u;
  return safe;
};

export const findPendingInviteByEmail = async (email: string): Promise<Invite | null> => {
  const normEmail = email.toLowerCase().trim();
  const now = new Date();
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<Invite>(
      `SELECT * FROM invites WHERE LOWER(email) = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`,
      [normEmail]
    );
    return res.rows[0] || null;
  }
  return memoryDb.invites.find(i => i.email.toLowerCase() === normEmail && i.status === 'pending' && new Date(i.expires_at) > now) || null;
};

export const resendInviteInDb = async (inviteId: string, newTokenHash: string, newExpiresAt: string): Promise<Invite | null> => {
  if (isPgConnectedFlag && pool) {
    const res = await pool.query<Invite>(
      `UPDATE invites SET token_hash = $1, expires_at = $2, status = 'pending' WHERE id = $3 RETURNING *`,
      [newTokenHash, newExpiresAt, inviteId]
    );
    return res.rows[0] || null;
  }

  const inv = memoryDb.invites.find(i => i.id === inviteId);
  if (!inv) return null;
  inv.token_hash = newTokenHash;
  inv.expires_at = newExpiresAt;
  inv.status = 'pending';
  return inv;
};

