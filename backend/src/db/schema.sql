-- Database Schema for Auth, Invite & Customer CRM System

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

-- Customer CRM Tables
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
