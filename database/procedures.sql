BEGIN;

CREATE OR REPLACE FUNCTION add_to_cart(
    p_user_id BIGINT,
    p_product_id BIGINT,
    p_qty INTEGER
)
RETURNS TABLE (
    cart_id BIGINT,
    cart_item_id BIGINT,
    final_quantity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id BIGINT;
    v_existing_qty INTEGER := 0;
    v_stock_qty INTEGER;
BEGIN
    IF p_qty IS NULL OR p_qty <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE user_id = p_user_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'User % is invalid or inactive', p_user_id;
    END IF;

    SELECT p.stock_qty
    INTO v_stock_qty
    FROM products p
    WHERE p.product_id = p_product_id
      AND p.is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found or inactive', p_product_id;
    END IF;

    INSERT INTO carts (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = NOW()
    RETURNING carts.cart_id INTO v_cart_id;

    SELECT ci.cart_item_id, ci.quantity
    INTO cart_item_id, v_existing_qty
    FROM cart_items ci
    WHERE ci.cart_id = v_cart_id
      AND ci.product_id = p_product_id;

    IF COALESCE(v_existing_qty, 0) + p_qty > v_stock_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product % (available %, requested total %)',
            p_product_id,
            v_stock_qty,
            COALESCE(v_existing_qty, 0) + p_qty;
    END IF;

    IF cart_item_id IS NULL THEN
        INSERT INTO cart_items (cart_id, product_id, quantity)
        VALUES (v_cart_id, p_product_id, p_qty)
        RETURNING cart_items.cart_item_id, cart_items.quantity
        INTO cart_item_id, final_quantity;
    ELSE
        UPDATE cart_items
        SET quantity = quantity + p_qty
        WHERE cart_items.cart_item_id = add_to_cart.cart_item_id
        RETURNING cart_items.quantity INTO final_quantity;
    END IF;

    cart_id := v_cart_id;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION place_order(
    p_user_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id BIGINT;
    v_order_id BIGINT;
    v_total_amount NUMERIC(12, 2) := 0;
    v_item RECORD;
BEGIN
    SELECT c.cart_id
    INTO v_cart_id
    FROM carts c
    WHERE c.user_id = p_user_id;

    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'No cart found for user %', p_user_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM cart_items ci
        WHERE ci.cart_id = v_cart_id
    ) THEN
        RAISE EXCEPTION 'Cannot place order: cart is empty';
    END IF;

    PERFORM 1
    FROM products p
    JOIN cart_items ci ON ci.product_id = p.product_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.product_id
    FOR UPDATE;

    FOR v_item IN
        SELECT
            ci.product_id,
            ci.quantity,
            p.stock_qty,
            p.price
        FROM cart_items ci
        JOIN products p ON p.product_id = ci.product_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        IF v_item.quantity > v_item.stock_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available %, cart qty %)',
                v_item.product_id,
                v_item.stock_qty,
                v_item.quantity;
        END IF;

        v_total_amount := v_total_amount + (v_item.quantity * v_item.price);
    END LOOP;

    INSERT INTO orders (user_id, order_status, total_amount, placed_at)
    VALUES (p_user_id, 'PLACED', v_total_amount, NOW())
    RETURNING order_id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT
        v_order_id,
        ci.product_id,
        ci.quantity,
        p.price
    FROM cart_items ci
    JOIN products p ON p.product_id = ci.product_id
    WHERE ci.cart_id = v_cart_id;

    DELETE FROM cart_items
    WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_inventory(
    p_product_id BIGINT,
    p_delta INTEGER,
    p_reason TEXT DEFAULT 'MANUAL_ADJUSTMENT'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_stock INTEGER;
BEGIN
    IF p_delta IS NULL OR p_delta = 0 THEN
        RAISE EXCEPTION 'Inventory delta must be non-zero';
    END IF;

    PERFORM 1
    FROM products
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;

    PERFORM set_config(
        'app.inventory_reason',
        COALESCE(NULLIF(BTRIM(p_reason), ''), 'MANUAL_ADJUSTMENT'),
        TRUE
    );
    PERFORM set_config('app.related_order_id', '', TRUE);

    UPDATE products
    SET stock_qty = stock_qty + p_delta
    WHERE product_id = p_product_id
    RETURNING stock_qty INTO v_new_stock;

    RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id BIGINT,
    p_user_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    SELECT *
    INTO v_order
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist', p_order_id;
    END IF;

    IF v_order.user_id <> p_user_id THEN
        RAISE EXCEPTION 'Order % does not belong to user %', p_order_id, p_user_id;
    END IF;

    IF v_order.order_status <> 'PLACED' THEN
        RAISE EXCEPTION 'Only PLACED orders can be cancelled. Current status: %', v_order.order_status;
    END IF;

    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        PERFORM set_config('app.inventory_reason', 'ORDER_CANCELLED_RESTOCK', TRUE);
        PERFORM set_config('app.related_order_id', p_order_id::TEXT, TRUE);

        UPDATE products
        SET stock_qty = stock_qty + v_item.quantity
        WHERE product_id = v_item.product_id;
    END LOOP;

    UPDATE orders
    SET
        order_status = 'CANCELLED',
        cancelled_at = NOW()
    WHERE order_id = p_order_id;

    RETURN TRUE;
END;
$$;

COMMIT;
