# TEST PLAN

Focused checklist for upgraded production-lite flow (auth sessions + richer cart + admin insights).

## 1) Schema and Integrity

1. Unique email constraint:
```sql
INSERT INTO users (full_name, email, password_hash) VALUES ('X', 'alice@example.com', 'h');
```
Expect: unique violation.

2. FK integrity:
```sql
INSERT INTO products (category_id, sku, product_name, price, stock_qty)
VALUES (99999, 'BAD-001', 'Invalid Product', 10, 5);
```
Expect: FK violation.

3. Session table + admin column existence:
```sql
\d users
\d user_sessions
```
Expect: `users.is_admin` and `user_sessions` present.

## 2) Procedure + Trigger Behavior

1. Add cart item:
```sql
SELECT * FROM add_to_cart(1, 1, 1);
```

2. Set cart quantity:
```sql
SELECT * FROM set_cart_item_quantity(1, <cart_item_id>, 2);
```

3. Remove cart item:
```sql
SELECT remove_cart_item(1, <cart_item_id>);
```

4. Place order:
```sql
SELECT place_order(1);
```

5. Cancel order:
```sql
SELECT cancel_order(<order_id>, 1);
```

6. Trigger checks:
- stock cannot go negative
- inventory and order audits are populated

## 3) API Contract Tests

### Auth
```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo.user@example.com","password":"demo1234","phone":"9991112233"}'
```

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.user@example.com","password":"demo1234"}'
```

Use returned `access_token`:
```bash
TOKEN="<access_token>"
```

```bash
curl http://127.0.0.1:8000/auth/me -H "Authorization: Bearer $TOKEN"
```

### Catalog / Cart / Orders
```bash
curl "http://127.0.0.1:8000/products?in_stock_only=true&sort=price_asc"
```

```bash
curl -X POST http://127.0.0.1:8000/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":1}'
```

```bash
curl http://127.0.0.1:8000/cart -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST http://127.0.0.1:8000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```bash
curl http://127.0.0.1:8000/orders -H "Authorization: Bearer $TOKEN"
```

## 4) Admin Endpoint Tests

Login with admin account and call:

```bash
curl http://127.0.0.1:8000/admin/summary -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:8000/admin/low-stock -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:8000/admin/top-products -H "Authorization: Bearer $TOKEN"
curl http://127.0.0.1:8000/admin/audit -H "Authorization: Bearer $TOKEN"
```

Expect non-admin token to get `403`.

## 5) UI Flow Validation

1. Login page default + signup link at bottom.
2. Signup page works and redirects to login.
3. Products: category chips, sort, search, price filters.
4. Cart: quantity update and remove actions.
5. Checkout: order summary and place order.
6. Orders: detail expansion and cancel path.
7. Admin page: metrics + low stock + top products + audit feeds.

## 6) Acceptance Criteria

- Protected routes enforce token auth.
- Legacy endpoints still respond for compatibility.
- Cart/order operations remain transaction-safe.
- Trigger and procedure effects are visible in DB.
- UX is polished and examiner demo flow is stable.
