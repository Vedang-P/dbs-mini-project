# Database-Driven Shopping Cart & Order Management System

Production-lite upgrade of the DBMS mini project using PostgreSQL, FastAPI, and vanilla JS, with:

- 3NF relational model + constraints + indexes
- stored procedures and triggers for inventory/order integrity
- token-based session auth
- modern multi-page commerce UI
- admin read-only insights dashboard

## Project Structure

```text
project/
│── api/
│   └── index.py
│── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
│── frontend/
│── database/
│   ├── schema.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   ├── queries.sql
│   └── SQL_VALIDATION_NOTES.md
│── scripts/
│   └── init_db.sh
│── vercel.json
│── requirements.txt
│── TEST_PLAN.md
│── DEMO_SCRIPT.md
```

## Tech Stack

- Database: PostgreSQL
- Backend: FastAPI + raw SQL (psycopg)
- Frontend: HTML/CSS/JavaScript (vanilla modules)
- Deployment: Vercel Services (frontend + backend services)

## Core Features

1. **DB integrity + SQL depth**
- Tables: `users`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`
- Added: `inventory_audit`, `order_audit`, `user_sessions`
- Constraints: PK, FK, UNIQUE, CHECK, DEFAULT, generated columns
- Procedures: `add_to_cart`, `set_cart_item_quantity`, `remove_cart_item`, `place_order`, `update_inventory`, `cancel_order`
- Triggers: non-negative stock enforcement, stock deduction on order, audit logging

2. **Session-based auth**
- Passwords hashed with PBKDF2-SHA256
- Access token sessions persisted in `user_sessions`
- Logout revokes current session token
- Protected shopper and admin endpoints

3. **Commerce UX**
- Login-first flow + separate signup page
- Product catalog with search, category chips, sort, price filters
- Cart quantity update + remove item
- Checkout summary + order placement
- Orders history + detail expansion + cancel flow

4. **Admin insights (read-only)**
- KPI summary
- Low-stock product list
- Top-selling products
- Inventory/order audit feeds

## API Overview

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Legacy compatibility:
- `POST /users/register`
- `POST /users/login`

### Catalog
- `GET /categories`
- `GET /products?category_id=&search=&in_stock_only=&sort=&min_price=&max_price=`

### Cart
- `GET /cart` (token-based; supports legacy `user_id` query fallback)
- `POST /cart/items`
- `PATCH /cart/items/{cart_item_id}`
- `DELETE /cart/items/{cart_item_id}`

Legacy compatibility:
- `POST /cart` with `{ user_id, product_id, quantity }`

### Orders
- `POST /orders`
- `GET /orders`
- `GET /orders/{order_id}`
- `POST /orders/{order_id}/cancel`

Legacy compatibility:
- `POST /order`

### Admin
- `GET /admin/summary`
- `GET /admin/low-stock`
- `GET /admin/top-products`
- `GET /admin/audit`

## Local Setup

### 1) Create DB

```bash
createdb dbs_mini_project
```

### 2) Backend env + deps

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Required env vars:
- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `SESSION_TTL_HOURS` (default 24)

### 3) Initialize SQL

```bash
cd ..
DATABASE_URL='postgresql://...' ./scripts/init_db.sh --seed
```

Notes:
- `--seed` runs demo seed + query file
- without `--seed`, script applies schema/triggers/procedures only

### 4) Run backend

```bash
cd backend
uvicorn app.main:app --reload
```

### 5) Open frontend

- Local frontend (served by frontend service in deployment): open `frontend/login.html`
- With backend running at local API base, UI uses `http://127.0.0.1:8000`

## Vercel Deployment

Project uses Vercel Services:
- frontend service: `frontend/main.py` at `/`
- backend service: `api/index.py` at `/_/backend`

Steps:

```bash
vercel link --yes
vercel --prod
```

Set Vercel env vars:
- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `SESSION_TTL_HOURS`

## Demo Notes

- Use a fresh signup account for shopper flow.
- First registered account becomes admin automatically (for admin dashboard demo).
- For complete demo flow and talking points, use:
  - `DEMO_SCRIPT.md`
  - `TEST_PLAN.md`

## Troubleshooting

1. **401 on protected APIs**
- Token expired/revoked. Login again.

2. **Checkout failure**
- Usually stock validation failure by procedure/trigger.

3. **No admin link visible**
- Logged-in user is not admin; use first registered account or set `users.is_admin = true`.
