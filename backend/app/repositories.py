import psycopg

from .config import AUTH_TOKEN_SECRET, SESSION_TTL_HOURS
from .security import generate_session_token, hash_session_token


def create_user(
    conn: psycopg.Connection,
    *,
    name: str,
    email: str,
    password_hash: str,
    phone: str | None,
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (full_name, email, password_hash, phone, is_admin)
            VALUES (
                %s,
                %s,
                %s,
                %s,
                NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE)
            )
            RETURNING user_id, full_name, email, phone, is_admin, created_at
            """,
            (name, email.lower(), password_hash, phone),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to create user")
        return row


def get_user_by_email(conn: psycopg.Connection, *, email: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, full_name, email, password_hash, is_active, is_admin
            FROM users
            WHERE email = %s
            """,
            (email.lower(),),
        )
        return cur.fetchone()


def get_user_by_id(conn: psycopg.Connection, *, user_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, full_name, email, is_active, is_admin
            FROM users
            WHERE user_id = %s
            """,
            (user_id,),
        )
        return cur.fetchone()


def create_session(conn: psycopg.Connection, *, user_id: int) -> dict:
    access_token = generate_session_token()
    token_hash = hash_session_token(access_token, AUTH_TOKEN_SECRET)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_sessions (user_id, token_hash, expires_at)
            VALUES (%s, %s, NOW() + make_interval(hours => %s))
            RETURNING expires_at
            """,
            (user_id, token_hash, SESSION_TTL_HOURS),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to create session")
        return {
            "access_token": access_token,
            "expires_at": row["expires_at"],
        }


def get_user_session_by_token_hash(conn: psycopg.Connection, *, token_hash: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                s.session_id,
                s.user_id,
                s.expires_at,
                u.full_name,
                u.email,
                u.is_active,
                u.is_admin
            FROM user_sessions s
            JOIN users u ON u.user_id = s.user_id
            WHERE s.token_hash = %s
              AND s.revoked_at IS NULL
              AND s.expires_at > NOW()
            """,
            (token_hash,),
        )
        session = cur.fetchone()
        if session is None:
            return None

        cur.execute(
            """
            UPDATE user_sessions
            SET last_used_at = NOW()
            WHERE session_id = %s
            """,
            (session["session_id"],),
        )
        return session


def revoke_session_by_token_hash(conn: psycopg.Connection, *, token_hash: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE user_sessions
            SET revoked_at = NOW()
            WHERE token_hash = %s
              AND revoked_at IS NULL
            RETURNING session_id
            """,
            (token_hash,),
        )
        row = cur.fetchone()
        return row is not None


def list_categories(conn: psycopg.Connection) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT category_id, category_name, description
            FROM categories
            ORDER BY category_name
            """
        )
        return list(cur.fetchall())


def get_products(
    conn: psycopg.Connection,
    *,
    category_id: int | None,
    search: str | None,
    in_stock_only: bool,
    sort: str | None,
    min_price: float | None,
    max_price: float | None,
) -> list[dict]:
    filters: list[str] = ["p.is_active = TRUE"]
    params: list[object] = []

    if category_id is not None:
        filters.append("p.category_id = %s")
        params.append(category_id)

    if search:
        filters.append("LOWER(p.product_name) LIKE %s")
        params.append(f"%{search.lower()}%")

    if in_stock_only:
        filters.append("p.stock_qty > 0")

    if min_price is not None:
        filters.append("p.price >= %s")
        params.append(min_price)

    if max_price is not None:
        filters.append("p.price <= %s")
        params.append(max_price)

    sort_map = {
        "name_asc": "p.product_name ASC",
        "name_desc": "p.product_name DESC",
        "price_asc": "p.price ASC",
        "price_desc": "p.price DESC",
        "stock_desc": "p.stock_qty DESC",
    }
    order_clause = sort_map.get(sort or "name_asc", "p.product_name ASC")
    where_clause = " AND ".join(filters)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                p.product_id,
                p.sku,
                p.product_name,
                p.description,
                p.price,
                p.stock_qty,
                p.reorder_level,
                c.category_id,
                c.category_name
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            WHERE {where_clause}
            ORDER BY {order_clause}
            """,
            tuple(params),
        )
        return list(cur.fetchall())


def create_product(
    conn: psycopg.Connection,
    *,
    category_id: int,
    sku: str,
    product_name: str,
    description: str | None,
    price: float,
    stock_qty: int,
    reorder_level: int,
    is_active: bool,
) -> dict:
    normalized_sku = sku.strip().upper()
    normalized_name = product_name.strip()
    normalized_description = (description or "").strip() or None

    if not normalized_sku:
        raise ValueError("SKU is required.")
    if not normalized_name:
        raise ValueError("Product name is required.")

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO products (
                category_id,
                sku,
                product_name,
                description,
                price,
                stock_qty,
                reorder_level,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING product_id, category_id, sku, product_name, description, price, stock_qty, reorder_level, is_active
            """,
            (
                category_id,
                normalized_sku,
                normalized_name,
                normalized_description,
                price,
                stock_qty,
                reorder_level,
                is_active,
            ),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to create product.")
        return row


def add_to_cart(
    conn: psycopg.Connection,
    *,
    user_id: int,
    product_id: int,
    quantity: int,
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT cart_id, cart_item_id, final_quantity
            FROM add_to_cart(%s, %s, %s)
            """,
            (user_id, product_id, quantity),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to add item to cart")
        return row


def update_cart_item_quantity(
    conn: psycopg.Connection,
    *,
    user_id: int,
    cart_item_id: int,
    quantity: int,
) -> dict:
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                ci.cart_item_id,
                ci.product_id,
                p.stock_qty
            FROM cart_items ci
            JOIN carts c ON c.cart_id = ci.cart_id
            JOIN products p ON p.product_id = ci.product_id
            WHERE c.user_id = %s
              AND ci.cart_item_id = %s
            FOR UPDATE
            """,
            (user_id, cart_item_id),
        )
        item = cur.fetchone()
        if item is None:
            raise ValueError("Cart item not found.")

        if quantity > item["stock_qty"]:
            raise ValueError(
                f"Insufficient stock. Available {item['stock_qty']}, requested {quantity}."
            )

        cur.execute(
            """
            UPDATE cart_items
            SET quantity = %s
            WHERE cart_item_id = %s
            RETURNING cart_item_id, product_id, quantity
            """,
            (quantity, cart_item_id),
        )
        updated = cur.fetchone()
        if updated is None:
            raise ValueError("Unable to update cart item.")
        return updated


def remove_cart_item(conn: psycopg.Connection, *, user_id: int, cart_item_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM cart_items ci
            USING carts c
            WHERE ci.cart_id = c.cart_id
              AND c.user_id = %s
              AND ci.cart_item_id = %s
            RETURNING ci.cart_item_id
            """,
            (user_id, cart_item_id),
        )
        deleted = cur.fetchone()
        return deleted is not None


def get_cart(conn: psycopg.Connection, *, user_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.cart_id, c.user_id
            FROM carts c
            WHERE c.user_id = %s
            """,
            (user_id,),
        )
        cart = cur.fetchone()
        if cart is None:
            return {"cart_id": None, "user_id": user_id, "item_count": 0, "items": [], "total_amount": 0}

        cur.execute(
            """
            SELECT
                ci.cart_item_id,
                ci.product_id,
                p.sku,
                p.product_name,
                p.price,
                p.stock_qty,
                ci.quantity,
                (p.price * ci.quantity) AS line_total
            FROM cart_items ci
            JOIN products p ON p.product_id = ci.product_id
            WHERE ci.cart_id = %s
            ORDER BY p.product_name
            """,
            (cart["cart_id"],),
        )
        items = list(cur.fetchall())

    total_amount = float(sum(item["line_total"] for item in items))
    return {
        "cart_id": cart["cart_id"],
        "user_id": user_id,
        "item_count": len(items),
        "items": items,
        "total_amount": total_amount,
    }


def place_order(conn: psycopg.Connection, *, user_id: int) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT place_order(%s) AS order_id", (user_id,))
        row = cur.fetchone()
        if row is None:
            raise ValueError("Order creation failed")
        return int(row["order_id"])


def get_orders(conn: psycopg.Connection, *, user_id: int) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                o.order_id,
                o.order_status,
                o.total_amount,
                o.placed_at,
                o.cancelled_at,
                o.completed_at,
                COUNT(oi.order_item_id) AS item_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'order_item_id', oi.order_item_id,
                            'product_id', oi.product_id,
                            'product_name', p.product_name,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'line_total', oi.line_total
                        )
                        ORDER BY oi.order_item_id
                    ) FILTER (WHERE oi.order_item_id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            LEFT JOIN products p ON p.product_id = oi.product_id
            WHERE o.user_id = %s
            GROUP BY o.order_id
            ORDER BY o.placed_at DESC
            """,
            (user_id,),
        )
        return list(cur.fetchall())


def get_order_by_id(conn: psycopg.Connection, *, user_id: int, order_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                o.order_id,
                o.order_status,
                o.total_amount,
                o.placed_at,
                o.cancelled_at,
                o.completed_at,
                COUNT(oi.order_item_id) AS item_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'order_item_id', oi.order_item_id,
                            'product_id', oi.product_id,
                            'product_name', p.product_name,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'line_total', oi.line_total
                        )
                        ORDER BY oi.order_item_id
                    ) FILTER (WHERE oi.order_item_id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            LEFT JOIN products p ON p.product_id = oi.product_id
            WHERE o.user_id = %s
              AND o.order_id = %s
            GROUP BY o.order_id
            """,
            (user_id, order_id),
        )
        return cur.fetchone()


def cancel_order(conn: psycopg.Connection, *, order_id: int, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT cancel_order(%s, %s) AS cancelled",
            (order_id, user_id),
        )
        row = cur.fetchone()
        return bool(row and row["cancelled"])


def get_admin_summary(conn: psycopg.Connection) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM orders) AS total_orders,
                (SELECT COUNT(*) FROM orders WHERE order_status = 'PLACED') AS placed_orders,
                (SELECT COUNT(*) FROM orders WHERE order_status = 'COMPLETED') AS completed_orders,
                (SELECT COUNT(*) FROM orders WHERE order_status = 'CANCELLED') AS cancelled_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE order_status IN ('PLACED', 'COMPLETED')) AS gross_revenue,
                (SELECT COUNT(*) FROM products WHERE stock_qty <= reorder_level) AS low_stock_products
            """
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to build admin summary")
        return row


def get_admin_low_stock(conn: psycopg.Connection) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                p.product_id,
                p.sku,
                p.product_name,
                c.category_name,
                p.stock_qty,
                p.reorder_level
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            WHERE p.stock_qty <= p.reorder_level
            ORDER BY p.stock_qty ASC, p.product_name
            LIMIT 50
            """
        )
        return list(cur.fetchall())


def get_admin_top_products(conn: psycopg.Connection) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                p.product_id,
                p.product_name,
                SUM(oi.quantity) AS units_sold,
                SUM(oi.line_total) AS revenue
            FROM order_items oi
            JOIN orders o ON o.order_id = oi.order_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE o.order_status IN ('PLACED', 'COMPLETED')
            GROUP BY p.product_id, p.product_name
            ORDER BY units_sold DESC, revenue DESC
            LIMIT 10
            """
        )
        return list(cur.fetchall())


def get_admin_audit(conn: psycopg.Connection) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                ia.audit_id,
                ia.product_id,
                p.product_name,
                ia.old_stock,
                ia.new_stock,
                ia.change_qty,
                ia.reason,
                ia.related_order_id,
                ia.changed_at
            FROM inventory_audit ia
            JOIN products p ON p.product_id = ia.product_id
            ORDER BY ia.changed_at DESC
            LIMIT 25
            """
        )
        inventory = list(cur.fetchall())

        cur.execute(
            """
            SELECT
                oa.audit_id,
                oa.order_id,
                oa.old_status,
                oa.new_status,
                oa.note,
                oa.changed_at
            FROM order_audit oa
            ORDER BY oa.changed_at DESC
            LIMIT 25
            """
        )
        orders = list(cur.fetchall())

    return {"inventory_audit": inventory, "order_audit": orders}
