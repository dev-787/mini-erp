# Enterprise Wholesale/Distribution ERP & CRM Platform

An enterprise-grade internal Web Platform engineered for wholesale and distribution enterprises. It unifies **Customer Relationship Management (CRM)**, **Real-Time Inventory & Stock Audit Trails**, **Sales Challan Dispatching**, and an **Admin-Managed Invitation & Session Security System** under strict Role-Based Access Control (RBAC).

---

## 🏛️ System Architecture

```text
┌─────────────────────────┐               HTTPS REST + httpOnly Cookies              ┌─────────────────────────┐
│     React 19 (SPA)      │ ─────────────────────────────────────────────────────────> │   Express (TypeScript)  │
│  Internal ERP & CRM UI  │ <───────────────────────────────────────────────────────── │  Stateless REST API     │
└─────────────────────────┘                                                          └────────────┬────────────┘
                                                                                                  │ SQL (Pool)
                                                                                                  ▼
                                                                                     ┌─────────────────────────┐
                                                                                     │    Neon PostgreSQL      │
                                                                                     │   Cloud Managed Database│
                                                                                     └─────────────────────────┘
```

- **Backend Architecture**: Built with **Node.js, Express, and TypeScript** (`dist/server.js`). Standardized controller layer, strongly-typed domain interfaces, centralized error management, and server-side role authorization guards.
- **Database Layer**: Hosted on **Neon Cloud PostgreSQL** with transaction-safe connection pooling, automated schema migrations, and an embedded zero-config fallback runner for offline/local environments.
- **Frontend Layer**: Built with **React 19, JavaScript (ESNext), and Vite**, featuring a responsive role-aware UI, in-memory auth state management, and custom modal control panels.

---

## 🔒 Security & Authentication Specification

### 1. No Public Signup (Invite-Only Onboarding)
To guarantee enterprise boundary security, public user registration is disabled. Account provisioning requires an **Admin Invitation** generated via `POST /api/auth/invite`. 

- Single-use cryptographically random tokens (32-byte hex) expiring in 7 days.
- Roles (`Admin`, `Sales`, `Warehouse`, `Accounts`) are assigned exclusively by the Admin at invite creation time and stored in the `invites` table.
- During user account setup (`POST /api/auth/accept-invite`), the role is assigned directly from the verified database record, preventing client-side privilege escalation.

### 2. Dual-Token Architecture & `httpOnly` Cookie Strategy
| Token | Expiry | Delivery Mechanism | Path Scope | Security Controls |
|---|---|---|---|---|
| **Access Token (JWT)** | 15 Minutes | `httpOnly` Cookie (`access_token`) | `/` | Stateless verification, zero DB hit on standard calls |
| **Refresh Token (JWT)** | 7 Days | `httpOnly` Cookie (`refresh_token`) | `/api/auth/refresh` | DB Session-backed verification, token rotation on use |

- **XSS Protection**: Tokens are delivered exclusively as `httpOnly` cookies (`sameSite: 'strict'`, `secure: true` in production). JavaScript cannot read or extract tokens from `localStorage` or `document.cookie`.
- **Path-Scoped Cookies**: The `refresh_token` cookie is restricted to `path: '/api/auth/refresh'`, minimizing token exposure during standard API transactions.

### 3. Session Tracking & Remote Revocation
- **Database Session Mapping**: Every active login generates a record in the `sessions` database table, storing the SHA-256 hash of the refresh token, Client IP Address, User Agent, and Revocation Status.
- **Refresh Token Rotation**: Utilizing a refresh token revokes its corresponding session row and issues a new refresh token and session ID, alerting on token reuse signals.
- **Device Management**: Users and Admins can view active logged-in devices and revoke individual sessions remotely via `DELETE /api/auth/sessions/:id`.

---

## 👥 User Roles & Access Matrix

| Role | Business Function | Permissions & Scope |
|---|---|---|
| **👑 Admin** | System Owner | Full access across all CRM, Inventory, and Dispatch modules. Exclusive privilege to create/revoke user invites and terminate user sessions. |
| **💼 Sales** | Customer & Orders | Full access to Customer CRM (Leads, Active accounts, Follow-up notes) and Sales Challan generation/confirmation. Read-only access to products. |
| **📦 Warehouse** | Stock Management | Full access to Product Catalog, Stock Movement logs (IN/OUT), and low-stock alerts. Read-only access to dispatches. |
| **📊 Accounts** | Financial Oversight | Access to confirmed dispatches, historical challan prices, and customer billing/GST records. |

---

## 🔑 SeedTest Credentials

| Role | Email Address | Password | Permissions Summary |
|---|---|---|---|
| **Admin** | `admin@example.com` | `Admin@123` | Full System & Auth Administration |
| **Sales Representative** | `sales@example.com` | `Sales@123` | CRM Management & Challan Dispatches |
| **Warehouse Manager** | `warehouse@example.com` | `Warehouse@123` | Product Stock & Inventory Movement Logs |
| **Accounts Officer** | `accounts@example.com` | `Accounts@123` | Financial Review of Confirmed Challans |

*(Seeded automatically into Neon Cloud PostgreSQL on server initialization.)*

---

## 📊 Database Schema (PostgreSQL)

```sql
-- Core Users Table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounts')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Invites Table
CREATE TABLE invites (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounts')),
  token_hash TEXT NOT NULL,
  invited_by VARCHAR(36) NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Sessions Table
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📡 API Endpoints Reference

### Authentication & Sessions (`/api/auth`)

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticates credentials, creates session, sets `httpOnly` cookies. |
| `POST` | `/api/auth/refresh` | Public (Cookie-Gated) | Validates refresh token cookie, rotates session, issues new access token. |
| `POST` | `/api/auth/logout` | Authenticated | Revokes current DB session and clears authentication cookies. |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user profile (`id`, `name`, `email`, `role`). |
| `POST` | `/api/auth/invite` | **Admin Only** | Generates a single-use invite token and link for a target role. |
| `GET` | `/api/auth/invite/:token` | Public | Validates raw invite token, returning pre-filled email and fixed role. |
| `POST` | `/api/auth/accept-invite` | Public (Rate Limited) | Consumes invite token, sets password, creates user, and logs in immediately. |
| `GET` | `/api/auth/invites` | **Admin Only** | Fetches system invite history with status badges and inviter metadata. |
| `DELETE` | `/api/auth/invites/:id` | **Admin Only** | Revokes a pending user invitation. |
| `GET` | `/api/auth/sessions` | Authenticated | Lists all active logged-in device sessions for the user. |
| `DELETE` | `/api/auth/sessions/:id` | Authenticated | Revokes a specific device session remotely. |

---

## 🚀 Environment & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Neon Cloud PostgreSQL (or local Postgres instance)

### 1. Backend Setup (`/backend`)
```bash
cd backend
npm install

# Setup Environment File
cp .env.example .env
```

**Configuration (`backend/.env`):**
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://neondb_owner:npg_3UwOQ4tIAWVq@ep-delicate-moon-axgppjcp-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=2b24a3e8d61b6127e8bed92ef06f3c2ab87085aeae896a028e51e80b9991f31b
JWT_REFRESH_SECRET=6b43fc13ed3eb123adbac4f372f25aba9c19e8f22173ce0566c3adb58224e039
```

**Build & Run:**
```bash
# Seed Database Tables & Initial Accounts
npm run seed

# Build TypeScript
npm run build

# Start Production Backend Server
npm start

# Run Automated Test Suite (11 Integration Tests)
npm test
```

### 2. Frontend Setup (`/frontend`)
```bash
cd frontend
npm install

# Start Vite Development Server
npm run dev

# Build Production Asset Bundle
npm run build
```

---

## 📁 Repository Directory Structure

```text
mini-erp/
├── backend/                  # Node.js + TypeScript Express REST Service
│   ├── dist/                 # Compiled JavaScript Production Build
│   ├── src/
│   │   ├── config/           # Environment & JWT Configuration
│   │   ├── db/               # PostgreSQL Pool, Schema & Seeding Engine
│   │   ├── middleware/       # JWT Auth, Role Guard, Rate Limiter
│   │   ├── modules/
│   │   │   └── auth/         # Controllers & Express Routes
│   │   ├── tests/            # Automated Test Suite (11 Test Scenarios)
│   │   ├── types/            # TypeScript Interfaces (User, Invite, Session)
│   │   └── server.ts         # Main Application Entry Point
│   ├── .env                  # Backend Environment Variables
│   ├── package.json
│   └── tsconfig.json         # NodeNext ES2022 TypeScript Configuration
│
├── frontend/                 # React 19 + JavaScript (ESNext) Client App
│   ├── src/
│   │   ├── api/              # HTTP Fetch Client with Credentials & Silent Refresh
│   │   ├── assets/           # Application Media & Logos
│   │   ├── components/
│   │   │   ├── admin/        # Admin Security & Invite Control Panel
│   │   │   └── layout/       # Navigation Header, Footer, Hero Showcase
│   │   ├── pages/
│   │   │   ├── auth/         # Login, Accept Invite, & Invite Notice Pages
│   │   │   ├── dashboard/    # Role Dashboard & Control Panel Trigger
│   │   │   └── home/         # Enterprise Landing Showcase
│   │   ├── store/            # In-Memory Auth Store & Session Check Hook
│   │   └── App.jsx           # React Router Route Definitions
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── PRD.md                    # Product Requirements & Business Logic Specs
└── README.md                 # Project Documentation
```
