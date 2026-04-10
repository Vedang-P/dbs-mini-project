# SQL Validation Notes

Run files in this order:

1. `database/schema.sql`
2. `database/triggers.sql`
3. `database/procedures.sql`
4. `database/queries.sql`

Quick verification checklist:

- `SELECT * FROM add_to_cart(1, 1, 1);`
- `SELECT * FROM set_cart_item_quantity(1, <cart_item_id>, 2);`
- `SELECT remove_cart_item(1, <cart_item_id>);`
- `SELECT place_order(1);`
- `SELECT update_inventory(1, 5, 'RESTOCK_TEST');`
- `SELECT cancel_order(<placed_order_id>, 1);`
- `SELECT * FROM inventory_audit ORDER BY changed_at DESC LIMIT 5;`
- `SELECT * FROM order_audit ORDER BY changed_at DESC LIMIT 5;`
