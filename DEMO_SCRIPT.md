# DEMO SCRIPT (UPGRADED PRODUCTION-LITE FLOW)

Estimated duration: 10 to 12 minutes

## 0) Pre-Demo Setup

1. Ensure DB is initialized:
```bash
DATABASE_URL='postgresql://...' ./scripts/init_db.sh --seed
```
2. Start backend:
```bash
cd backend
uvicorn app.main:app --reload
```
3. Open frontend login page.

## 1) Quick Architecture Intro (1 min)

- Show backend, frontend, database folders.
- Mention advanced DBMS features: procedures + triggers + audit + transactions.
- Mention upgraded auth/session model and admin insights layer.

## 2) Auth Flow (1.5 min)

1. Open **Login** page (default).
2. Click signup link, create a new account.
3. Login and mention token-based authenticated session (`/auth/login` + bearer token).

## 3) Catalog Experience (2 min)

1. Show category chips and filters (search, sort, price range, in-stock).
2. Add multiple products from different categories.
3. Mention stock-aware validation is enforced by DB logic.

## 4) Cart + Checkout (2 min)

1. Open cart page.
2. Update item quantity and remove one item.
3. Proceed to checkout and place order.
4. Show success message with created order ID.

## 5) Orders + Status Actions (1.5 min)

1. Open order history.
2. Expand order details.
3. Cancel one `PLACED` order and show updated status.

## 6) Database Proof (2 min)

Run in SQL editor:

```sql
SELECT * FROM orders ORDER BY order_id DESC LIMIT 5;
SELECT * FROM order_items ORDER BY order_item_id DESC LIMIT 10;
SELECT product_id, product_name, stock_qty FROM products ORDER BY product_id;
SELECT * FROM inventory_audit ORDER BY changed_at DESC LIMIT 10;
SELECT * FROM order_audit ORDER BY changed_at DESC LIMIT 10;
```

Explain:
- order persistence
- inventory movement
- automatic trigger-based audit logs

## 7) Admin Insights Demo (1.5 min)

1. Open admin page.
2. Show summary KPIs (users, orders, revenue, low-stock count).
3. Show low-stock list and top products.
4. Show recent inventory/order audit entries.

## 8) Rubric Alignment Close

- **Design correctness:** normalized schema + relationships + constraints.
- **SQL complexity:** joins, subqueries, aggregations, procedures, triggers.
- **Data integrity:** transaction-safe checkout and strict stock validation.
- **Code quality:** modular backend and structured frontend modules.
- **UI clarity:** modern shopper UX + dedicated admin insights.
- **Demo readiness:** full end-to-end flow with DB-level proof.
