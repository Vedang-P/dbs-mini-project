BEGIN;

CREATE OR REPLACE FUNCTION trg_prevent_negative_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.stock_qty < 0 THEN
        RAISE EXCEPTION 'Stock cannot become negative for product %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_reduce_stock_after_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    SELECT p.stock_qty
    INTO v_current_stock
    FROM products p
    WHERE p.product_id = NEW.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found while creating order item', NEW.product_id;
    END IF;

    IF v_current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % (available %, required %)',
            NEW.product_id,
            v_current_stock,
            NEW.quantity;
    END IF;

    PERFORM set_config('app.inventory_reason', 'ORDER_PLACED_STOCK_REDUCTION', TRUE);
    PERFORM set_config('app.related_order_id', NEW.order_id::TEXT, TRUE);

    UPDATE products
    SET stock_qty = stock_qty - NEW.quantity
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_log_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_reason TEXT;
    v_order_id BIGINT;
BEGIN
    IF NEW.stock_qty IS DISTINCT FROM OLD.stock_qty THEN
        v_reason := COALESCE(
            NULLIF(current_setting('app.inventory_reason', TRUE), ''),
            'STOCK_UPDATED'
        );
        v_order_id := NULLIF(current_setting('app.related_order_id', TRUE), '')::BIGINT;

        INSERT INTO inventory_audit (
            product_id,
            old_stock,
            new_stock,
            change_qty,
            reason,
            related_order_id,
            changed_at
        )
        VALUES (
            NEW.product_id,
            OLD.stock_qty,
            NEW.stock_qty,
            NEW.stock_qty - OLD.stock_qty,
            v_reason,
            v_order_id,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO order_audit (order_id, old_status, new_status, note, changed_at)
        VALUES (NEW.order_id, NULL, NEW.order_status, 'ORDER_CREATED', NOW());
    ELSIF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
        INSERT INTO order_audit (order_id, old_status, new_status, note, changed_at)
        VALUES (NEW.order_id, OLD.order_status, NEW.order_status, 'ORDER_STATUS_UPDATED', NOW());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_prevent_negative_stock ON products;
CREATE TRIGGER trg_products_prevent_negative_stock
BEFORE UPDATE OF stock_qty ON products
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_negative_inventory();

DROP TRIGGER IF EXISTS trg_order_items_reduce_stock ON order_items;
CREATE TRIGGER trg_order_items_reduce_stock
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION trg_reduce_stock_after_order_item();

DROP TRIGGER IF EXISTS trg_products_inventory_audit ON products;
CREATE TRIGGER trg_products_inventory_audit
AFTER UPDATE OF stock_qty ON products
FOR EACH ROW
EXECUTE FUNCTION trg_log_inventory_change();

DROP TRIGGER IF EXISTS trg_orders_status_audit ON orders;
CREATE TRIGGER trg_orders_status_audit
AFTER INSERT OR UPDATE OF order_status ON orders
FOR EACH ROW
EXECUTE FUNCTION trg_log_order_status_change();

COMMIT;
