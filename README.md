# Database-Driven Shopping Cart & Order Management System

A full mini-project that demonstrates core DBMS concepts using a realistic e-commerce flow:

- PostgreSQL schema in 3NF with constraints, indexes, procedures, and triggers.
- FastAPI backend with raw SQL and transaction-safe operations.
- Vanilla HTML/CSS/JS frontend for register/login, products, cart, checkout, and orders.
- Demo-ready SQL query showcase, test checklist, and live demonstration script.

## Final Project Structure

```text
project/
│── api/
│   └── index.py
│── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
│── scripts/
│   └── init_db.sh
│── frontend/
│── database/
│   ├── schema.sql
│   ├── queries.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   └── SQL_VALIDATION_NOTES.md
│── requirements.txt
│── vercel.json
│── TEST_PLAN.md
│── DEMO_SCRIPT.md
│── README.md
```

## Tech Stack

- Database: PostgreSQL
- Backend: FastAPI (Python)
- Frontend: HTML/CSS/JavaScript (vanilla)
- SQL style: raw SQL (joins, aggregation, subqueries, procedures, triggers)

## Key Features

1. **Schema and Data Integrity**
- Mandatory entities: `users`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`.
- Extra audit entities: `inventory_audit`, `order_audit`.
- Integrity controls: PK, FK, UNIQUE, CHECK, DEFAULT, timestamp management.
- Performance indexes on product search, cart lookup, order history, low-stock checks.

2. **Stored Procedures / Functions**
- `add_to_cart(p_user_id, p_product_id, p_qty)`
- `place_order(p_user_id)`
- `update_inventory(p_product_id, p_delta, p_reason)`
- `cancel_order(p_order_id, p_user_id)`

3. **Triggers**
- Prevent negative inventory.
- Reduce stock when order items are inserted.
- Log inventory and order-status changes in audit tables.

4. **API Endpoints**
- `POST /users/register`
- `POST /users/login`
- `GET /products`
- `POST /cart`
- `GET /cart`
- `POST /order`
- `GET /orders`
- `POST /orders/{order_id}/cancel`

5. **Frontend Pages**
- `login.html` (register + login)
- `products.html`
- `cart.html`
- `checkout.html`
- `orders.html`

## Database Design Notes (3NF)

- Categories are separate from products and referenced by foreign key.
- Cart and order line items only store relationship + transactional facts.
- `order_items.unit_price` preserves historical sale price snapshot.
- Derived line total is generated and stored to simplify reporting queries.

## Setup Instructions

### 1) Create Database

```bash
createdb dbs_mini_project
```

### 2) Install Backend Dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..
```

### 3) Initialize SQL Objects and Seed Data

Run files in this order:

```bash
psql -d dbs_mini_project -f database/schema.sql
psql -d dbs_mini_project -f database/triggers.sql
psql -d dbs_mini_project -f database/procedures.sql
psql -d dbs_mini_project -f database/queries.sql
```

### 4) Start Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 5) Open Frontend

- If backend is running, open: `http://127.0.0.1:8000/ui/login.html`
- You can also open files directly from `frontend/`, but backend API must still be running.

## Vercel Deployment (Production Ready)

This repository is now configured for Vercel **Services** deployment using:

- `experimentalServices` in `vercel.json`
- `frontend` service at `/` via `frontend/main.py` (FastAPI static file host)
- `backend` FastAPI service at `/_/backend`
- `api/index.py` as backend service entrypoint

### 1) Create/Use a PostgreSQL Database

Use a hosted PostgreSQL database (Neon/Supabase/RDS/etc.) and copy its connection string as `DATABASE_URL`.

### 2) Initialize Database on Hosted Postgres

From your terminal:

```bash
export DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'
./scripts/init_db.sh
```

### 3) Add Vercel Environment Variable

Set `DATABASE_URL` in your Vercel project (Production and Preview).

### 4) Deploy (Services Preset)

```bash
vercel --prod
```

### 5) Validate Deployed App

- Homepage: `/` (loads login page)
- Backend API examples:
  - `GET /_/backend/health`
  - `GET /_/backend/products`
  - `POST /_/backend/users/register`
  - `POST /_/backend/users/login`
  - `POST /_/backend/cart`
  - `POST /_/backend/order`
  - `GET /_/backend/orders?user_id=...`

## API Contract Summary

### `POST /users/register`
Request:
```json
{ "name": "Test User", "email": "test@example.com", "password": "secret123", "phone": "9999999999" }
```

### `POST /users/login`
Request:
```json
{ "email": "test@example.com", "password": "secret123" }
```
Response includes `user_id` for local frontend context.

### `GET /products`
Optional query params: `category_id`, `search`, `in_stock_only`

### `POST /cart`
Request:
```json
{ "user_id": 1, "product_id": 2, "quantity": 1 }
```

### `POST /order`
Request:
```json
{ "user_id": 1 }
```

### `GET /orders?user_id=1`
Returns user order history with nested order items.

### `POST /orders/{order_id}/cancel`
Request:
```json
{ "user_id": 1 }
```

## SQL Demo Coverage

`database/queries.sql` includes:

- Basic queries:
  - List all products
  - View cart items for a user
  - Show user orders
- Complex queries:
  - Top-selling products
  - Total revenue
  - Low-stock products
  - User purchase history
  - Nested subquery for above-average spenders
- Audit table reads for trigger demonstration

## Transaction and ACID Coverage

- Checkout (`place_order`) is atomic:
  - validates stock,
  - creates order,
  - inserts order items,
  - reduces stock via trigger,
  - clears cart.
- On failure, transaction is rolled back and no partial order remains.

## Testing and Demo Assets

- Detailed test checklist: [`TEST_PLAN.md`](TEST_PLAN.md)
- Full live-demo flow: [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)
- SQL object verification: `database/SQL_VALIDATION_NOTES.md`

## Troubleshooting

1. **Connection errors**
- Verify `DATABASE_URL` in local `.env` or Vercel project env vars.
- Confirm PostgreSQL service is running.

2. **Order placement fails for stock**
- Expected behavior when cart qty exceeds available stock.

3. **Seed users cannot login**
- Seeded users use placeholder hashes; create a user from UI for live login demo.

4. **If login fails for an old account after updates**
- Create a fresh account from `signup.html` and login with that new account.
