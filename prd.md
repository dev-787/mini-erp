# Product Requirements Document (PRD)
## Wholesale/Distribution ERP + CRM System

---

## 1. Purpose

This document defines the scope, workflow, roles, and functional requirements for a small internal ERP/CRM system built for a wholesale/distribution company. The system replaces manual/paper/Excel-based tracking of customers, stock, and sales dispatches with a single internal web application used by employees across Sales, Warehouse, and Accounts.

The goal of this project (for the purpose of this assignment) is to demonstrate full-stack engineering competence — backend API design, database modeling, frontend UI, authentication/authorization, and deployment — on a realistic, business-driven use case rather than a toy CRUD app.

---

## 2. Background & Problem Statement

A wholesale/distribution business sits between suppliers and retail/wholesale/distributor customers. It buys in bulk and sells onward. Without a system, such businesses typically face:

- No structured customer database — leads and follow-ups tracked informally, easily forgotten.
- No real-time visibility into stock levels — leads to overselling or missed reorder points.
- No consistent record of what was dispatched to whom, when, and at what price — especially problematic when prices change over time and old delivery records need to reflect the price at the time of sale.
- No role separation — anyone can edit anything, increasing the risk of errors (e.g., a salesperson accidentally editing stock).

This system addresses these problems with three core modules — **CRM**, **Inventory**, and **Sales Challan** — sitting behind role-based authentication.

---

## 3. Goals

- Provide a single source of truth for customers, products/stock, and sales dispatches (challans).
- Enforce correct business logic around stock (never negative, always logged).
- Support role-based workflows so each employee type sees and does only what's relevant to their job.
- Be deployable, documented, and demonstrable within the scope of a short assignment — not over-engineered.

### Non-Goals (out of scope for v1)
- Full accounting/ledger system (GST filing, payment reconciliation, tax invoices).
- Purchase order module (receiving stock from suppliers) — only stock IN/OUT logging is required.
- Multi-warehouse transfer logic beyond a simple "location" field.
- Mobile app (responsive web is sufficient).

---

## 4. User Roles & Permissions

| Role | Description | Key Permissions |
|---|---|---|
| **Admin** | Full system owner/super-user | All permissions across all modules, including user management |
| **Sales** | Manages customer relationships and dispatches | Create/edit customers, add follow-ups, create & confirm challans, view products (read-only) |
| **Warehouse** | Manages physical stock | Create/edit products, log stock movements (IN/OUT), view challans (to know what to pack/dispatch) |
| **Accounts** | Manages financial visibility | View confirmed challans, view customer billing/GST details, (future: generate invoices) |

**Authorization principle:** Every API endpoint must check both authentication (valid JWT) and authorization (role allowed to perform this action). Frontend hides/disables UI for actions a role cannot perform, but the backend is the actual source of enforcement — the frontend check is UX only, not security.

---

## 5. Core Modules & Functional Requirements

### 5.1 Authentication & Roles
- Users log in with email/username + password.
- JWT issued on successful login, containing user id and role.
- Role-based route/endpoint guards on the backend.
- (No self-signup required — users/roles are provisioned by Admin or seeded for the assignment.)

### 5.2 Customer CRM Module
**Entity fields:** name, mobile number, email, business name, GST number (optional), customer type (Retail / Wholesale / Distributor), address, status (Lead / Active / Inactive), follow-up date, notes.

**Features:**
- Add / edit customer
- Search & filter customer list (by name, status, type)
- Customer detail page showing full profile + follow-up history
- Add follow-up notes (timestamped, appended — not overwritten)

**Business rule:** A customer typically starts as `Lead`, and is moved to `Active` once they've placed at least one confirmed order (manual status change is acceptable for v1; auto-transition is a nice-to-have).

### 5.3 Product & Inventory Module
**Entity fields:** product name, SKU/code, category, unit price, current stock, minimum stock alert quantity, location/warehouse.

**Features:**
- Add / edit product
- Stock movement log per product, recording: product, quantity changed, movement type (IN/OUT), reason, created by, timestamp.
- Low-stock indicator when current stock ≤ minimum stock alert quantity.

**Business rule:** Stock is never edited directly on the product record in isolation — every change to `current_stock` must be accompanied by a corresponding stock movement log entry, so the log is always a complete audit trail.

### 5.4 Sales Challan Module
**Entity fields:** challan number (auto-generated), customer, line items (products + quantity + snapshotted name/price), total quantity, status (Draft / Confirmed / Cancelled), created by, created date.

**Features:**
- Select customer, add multiple products with quantities.
- Save as **Draft** (editable, does not affect stock).
- Mark as **Confirmed** (triggers stock deduction).
- Cancel a challan (if business rules allow — e.g., only Drafts, or Confirmed with stock reversal — to be defined during implementation).

**Business rules (critical):**
1. On confirmation, backend validates sufficient stock for **every** line item before committing any change (atomic transaction).
2. If any product has insufficient stock, the entire confirmation is rejected with a clear error identifying which product(s) are short.
3. Stock must never go negative.
4. Confirming a challan creates corresponding stock movement log entries (type `OUT`, reason = challan number).
5. The challan stores a **snapshot** of product name and price at the time of sale (not just a foreign key), so historical challans remain accurate even if the product record changes later.

---

## 6. High-Level Workflow

```
Lead captured → Customer added (status: Lead)
        │
        ▼
Sales follow-up → notes/follow-up date updated → status moved to Active
        │
        ▼
Sales creates Challan (Draft) → selects customer + products + quantities
        │
        ▼
Sales confirms Challan
        │
        ├── Stock sufficient → stock reduced, movement logged (OUT), challan → Confirmed
        └── Stock insufficient → API error, challan stays Draft
        │
        ▼
Warehouse dispatches goods per confirmed challan
        │
        ▼
Accounts reviews confirmed challans for invoicing/reconciliation (future scope)

Parallel: Warehouse/Admin add stock → movement logged (IN) → current stock updated
```

---

## 7. System Architecture (Summary)

3-tier web architecture:

- **Frontend:** React SPA, responsive, role-aware UI, communicates via REST + JWT.
- **Backend:** Node.js + TypeScript (Express or NestJS), stateless REST API, input validation, centralized error handling, role-guarded routes.
- **Database:** PostgreSQL (or MySQL), relational schema with foreign keys between customers, products, challans, and stock movements.

Deployment target: free-tier hosting (frontend on Vercel/Netlify, backend on Render/Railway, DB on Supabase/Neon), with AWS deployment treated as a bonus rather than a requirement.

*(Full schema and folder structure to be documented separately in the codebase / README.)*

---

## 8. API Expectations

- RESTful conventions (`GET /customers`, `POST /customers`, `PATCH /customers/:id`, etc.)
- Consistent response shape and proper HTTP status codes (200/201/400/401/403/404/409/500).
- Input validation on every write endpoint, with descriptive error messages.
- Pagination on list endpoints (customers, products, challans).
- Search/filter query params where relevant (e.g., `?status=Lead&search=abc`).
- Postman collection provided as part of submission for manual verification.

---

## 9. Success Criteria (for this assignment)

- All four core modules (Auth, CRM, Inventory, Challan) functional end-to-end.
- Stock-deduction logic on challan confirmation is correct and race-safe (no negative stock, atomic).
- Role-based access is enforced on the backend, not just hidden in the UI.
- Clean, working local setup with clear README instructions.
- (Bonus) Live deployment, Docker setup, PDF export, S3 image upload.

---

## 10. Assumptions

- No self-service signup; roles/users are seeded or created by Admin.
- Challan → Invoice conversion is out of scope; challans are the final financial artifact tracked in v1.
- Single-currency, single-country (India, based on GST field) business context.
- Multi-warehouse is represented as a simple text/location field, not a full separate module.

---

## 11. Known Limitations (to be updated post-implementation)

- No automated invoice generation.
- No payment tracking / accounts reconciliation beyond viewing confirmed challans.
- No purchase order module for incoming supplier stock (stock IN is logged manually).