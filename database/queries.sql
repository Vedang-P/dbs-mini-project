BEGIN;

-- ------------------------------------------------------------
-- Seed Data
-- ------------------------------------------------------------

INSERT INTO users (full_name, email, password_hash, phone)
VALUES
    ('Alice Johnson', 'alice@example.com', 'pbkdf2_sha256$240000$2NGuhKYuKLxyWB0Nd1b00g==$4ZV7RI53Y8sUElRRXyST/zU/cqRQDZ24J5d/MEBl82Y=', '9876543201'),
    ('Bob Smith', 'bob@example.com', '$2b$12$seed_hash', '9876543202'),
    ('Charlie Davis', 'charlie@example.com', '$2b$12$seed_hash', '9876543203'),
    ('Diana Lee', 'diana@example.com', '$2b$12$seed_hash', '9876543204'),
    ('Ethan Brown', 'ethan@example.com', '$2b$12$seed_hash', '9876543205'),
    ('Farah Khan', 'farah@example.com', '$2b$12$seed_hash', '9876543206'),
    ('George Miller', 'george@example.com', '$2b$12$seed_hash', '9876543207'),
    ('Hina Patel', 'hina@example.com', '$2b$12$seed_hash', '9876543208'),
    ('Ishan Verma', 'ishan@example.com', '$2b$12$seed_hash', '9876543209'),
    ('Julia Wilson', 'julia@example.com', '$2b$12$seed_hash', '9876543210')
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET
    is_admin = TRUE,
    password_hash = 'pbkdf2_sha256$240000$2NGuhKYuKLxyWB0Nd1b00g==$4ZV7RI53Y8sUElRRXyST/zU/cqRQDZ24J5d/MEBl82Y='
WHERE email = 'alice@example.com';

INSERT INTO categories (category_name, description)
VALUES
    ('Electronics', 'Electronic gadgets and devices'),
    ('Home Essentials', 'Household and kitchen needs'),
    ('Books', 'Fiction, non-fiction, and learning resources'),
    ('Fashion', 'Clothing and accessories'),
    ('Sports', 'Fitness and sports gear'),
    ('Beauty', 'Skincare and personal care products')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO products (category_id, sku, product_name, description, price, stock_qty, reorder_level)
VALUES
    ((SELECT category_id FROM categories WHERE category_name = 'Electronics'), 'ELEC-001', 'Wireless Mouse', 'Ergonomic 2.4GHz mouse', 799.00, 80, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Electronics'), 'ELEC-002', 'Mechanical Keyboard', 'Backlit keyboard with blue switches', 2899.00, 50, 8),
    ((SELECT category_id FROM categories WHERE category_name = 'Electronics'), 'ELEC-003', 'Noise Cancelling Headphones', 'Over-ear ANC headphones', 5499.00, 35, 6),
    ((SELECT category_id FROM categories WHERE category_name = 'Electronics'), 'ELEC-004', 'Portable SSD 1TB', 'USB-C high-speed external SSD', 7499.00, 26, 5),
    ((SELECT category_id FROM categories WHERE category_name = 'Home Essentials'), 'HOME-001', 'Non-Stick Frying Pan', 'Induction friendly 28cm pan', 1399.00, 65, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Home Essentials'), 'HOME-002', 'Electric Kettle', '1.5L auto cut-off kettle', 1699.00, 42, 8),
    ((SELECT category_id FROM categories WHERE category_name = 'Home Essentials'), 'HOME-003', 'Vacuum Cleaner', 'Bagless high suction vacuum', 6999.00, 18, 4),
    ((SELECT category_id FROM categories WHERE category_name = 'Home Essentials'), 'HOME-004', 'Water Bottle Set', 'Steel bottle set of 3', 899.00, 90, 12),
    ((SELECT category_id FROM categories WHERE category_name = 'Books'), 'BOOK-001', 'Database Systems Fundamentals', 'Introductory DBMS textbook', 799.00, 75, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Books'), 'BOOK-002', 'Advanced SQL Patterns', 'Practical SQL optimization guide', 999.00, 52, 8),
    ((SELECT category_id FROM categories WHERE category_name = 'Books'), 'BOOK-003', 'Python for Backend Development', 'Build APIs with modern Python', 699.00, 60, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Books'), 'BOOK-004', 'Data Modeling in Practice', 'Real-world data modeling techniques', 849.00, 40, 7),
    ((SELECT category_id FROM categories WHERE category_name = 'Fashion'), 'FASH-001', 'Cotton T-Shirt', 'Regular fit unisex tee', 499.00, 120, 15),
    ((SELECT category_id FROM categories WHERE category_name = 'Fashion'), 'FASH-002', 'Denim Jeans', 'Slim-fit stretch denim', 1599.00, 58, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Fashion'), 'FASH-003', 'Running Shoes', 'Lightweight cushioned shoes', 3199.00, 33, 6),
    ((SELECT category_id FROM categories WHERE category_name = 'Fashion'), 'FASH-004', 'Leather Wallet', 'Bi-fold genuine leather wallet', 1199.00, 44, 7),
    ((SELECT category_id FROM categories WHERE category_name = 'Sports'), 'SPORT-001', 'Yoga Mat', 'Anti-slip 6mm mat', 899.00, 70, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Sports'), 'SPORT-002', 'Dumbbell Pair 10kg', 'Rubber-coated dumbbells', 2499.00, 25, 5),
    ((SELECT category_id FROM categories WHERE category_name = 'Sports'), 'SPORT-003', 'Badminton Racket', 'Carbon fiber performance racket', 1899.00, 30, 5),
    ((SELECT category_id FROM categories WHERE category_name = 'Sports'), 'SPORT-004', 'Football', 'Match-quality size 5 football', 999.00, 55, 8),
    ((SELECT category_id FROM categories WHERE category_name = 'Beauty'), 'BEAU-001', 'Face Wash', 'Gentle daily cleanser', 349.00, 85, 12),
    ((SELECT category_id FROM categories WHERE category_name = 'Beauty'), 'BEAU-002', 'Sunscreen SPF 50', 'Broad spectrum UVA/UVB protection', 499.00, 62, 10),
    ((SELECT category_id FROM categories WHERE category_name = 'Beauty'), 'BEAU-003', 'Vitamin C Serum', 'Brightening antioxidant serum', 799.00, 38, 6),
    ((SELECT category_id FROM categories WHERE category_name = 'Beauty'), 'BEAU-004', 'Body Lotion', 'Hydrating lotion for dry skin', 449.00, 77, 10)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO carts (user_id)
SELECT user_id
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cart_items (cart_id, product_id, quantity)
VALUES
    (
        (SELECT c.cart_id FROM carts c JOIN users u ON u.user_id = c.user_id WHERE u.email = 'alice@example.com'),
        (SELECT product_id FROM products WHERE sku = 'ELEC-001'),
        2
    ),
    (
        (SELECT c.cart_id FROM carts c JOIN users u ON u.user_id = c.user_id WHERE u.email = 'alice@example.com'),
        (SELECT product_id FROM products WHERE sku = 'BOOK-002'),
        1
    ),
    (
        (SELECT c.cart_id FROM carts c JOIN users u ON u.user_id = c.user_id WHERE u.email = 'bob@example.com'),
        (SELECT product_id FROM products WHERE sku = 'SPORT-001'),
        1
    ),
    (
        (SELECT c.cart_id FROM carts c JOIN users u ON u.user_id = c.user_id WHERE u.email = 'bob@example.com'),
        (SELECT product_id FROM products WHERE sku = 'HOME-002'),
        1
    )
ON CONFLICT (cart_id, product_id) DO UPDATE
SET quantity = EXCLUDED.quantity;

WITH new_order AS (
    INSERT INTO orders (user_id, order_status, placed_at, completed_at)
    VALUES (
        (SELECT user_id FROM users WHERE email = 'charlie@example.com'),
        'COMPLETED',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '9 days'
    )
    RETURNING order_id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
    n.order_id,
    p.product_id,
    v.quantity,
    p.price
FROM new_order n
JOIN (
    VALUES
        ('ELEC-002', 1),
        ('BOOK-001', 2),
        ('FASH-001', 3)
) AS v(sku, quantity) ON TRUE
JOIN products p ON p.sku = v.sku;

WITH new_order AS (
    INSERT INTO orders (user_id, order_status, placed_at, completed_at)
    VALUES (
        (SELECT user_id FROM users WHERE email = 'diana@example.com'),
        'COMPLETED',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '4 days'
    )
    RETURNING order_id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
    n.order_id,
    p.product_id,
    v.quantity,
    p.price
FROM new_order n
JOIN (
    VALUES
        ('HOME-003', 1),
        ('BEAU-002', 2),
        ('SPORT-004', 1)
) AS v(sku, quantity) ON TRUE
JOIN products p ON p.sku = v.sku;

WITH new_order AS (
    INSERT INTO orders (user_id, order_status, placed_at)
    VALUES (
        (SELECT user_id FROM users WHERE email = 'ethan@example.com'),
        'PLACED',
        NOW() - INTERVAL '1 day'
    )
    RETURNING order_id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
    n.order_id,
    p.product_id,
    v.quantity,
    p.price
FROM new_order n
JOIN (
    VALUES
        ('FASH-003', 1),
        ('SPORT-002', 1),
        ('BEAU-001', 2)
) AS v(sku, quantity) ON TRUE
JOIN products p ON p.sku = v.sku;

UPDATE orders o
SET total_amount = COALESCE((
    SELECT SUM(oi.line_total)
    FROM order_items oi
    WHERE oi.order_id = o.order_id
), 0);

COMMIT;

-- ------------------------------------------------------------
-- Basic Queries (Demo Required)
-- ------------------------------------------------------------

-- 1) List all products with category info.
SELECT
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    p.price,
    p.stock_qty,
    p.is_active
FROM products p
JOIN categories c ON c.category_id = p.category_id
ORDER BY p.product_name;

-- 1A) List all categories.
SELECT category_id, category_name, description
FROM categories
ORDER BY category_name;

-- 2) View cart items for a user (replace email as needed).
SELECT
    u.user_id,
    u.full_name,
    p.product_name,
    ci.quantity,
    p.price,
    (ci.quantity * p.price) AS line_total
FROM users u
JOIN carts c ON c.user_id = u.user_id
JOIN cart_items ci ON ci.cart_id = c.cart_id
JOIN products p ON p.product_id = ci.product_id
WHERE u.email = 'alice@example.com'
ORDER BY p.product_name;

-- 3) Show user orders (replace email as needed).
SELECT
    o.order_id,
    o.order_status,
    o.total_amount,
    o.placed_at,
    COUNT(oi.order_item_id) AS item_lines
FROM orders o
JOIN users u ON u.user_id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.order_id
WHERE u.email = 'charlie@example.com'
GROUP BY o.order_id
ORDER BY o.placed_at DESC;

-- ------------------------------------------------------------
-- Complex Queries
-- ------------------------------------------------------------

-- 1) Top-selling products by quantity and revenue.
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS total_units_sold,
    SUM(oi.line_total) AS revenue_generated
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE o.order_status IN ('PLACED', 'COMPLETED')
GROUP BY p.product_id, p.product_name
ORDER BY total_units_sold DESC, revenue_generated DESC
LIMIT 10;

-- 2) Total revenue from completed orders.
SELECT
    COALESCE(SUM(total_amount), 0) AS total_revenue_completed_orders
FROM orders
WHERE order_status = 'COMPLETED';

-- 3) Products low in stock.
SELECT
    product_id,
    sku,
    product_name,
    stock_qty,
    reorder_level
FROM products
WHERE stock_qty <= reorder_level
ORDER BY stock_qty ASC, product_name;

-- 4) User purchase history with aggregates.
SELECT
    u.user_id,
    u.full_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(oi.quantity), 0) AS total_items_bought,
    COALESCE(SUM(oi.line_total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.user_id AND o.order_status IN ('PLACED', 'COMPLETED')
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY u.user_id, u.full_name
ORDER BY total_spent DESC, total_orders DESC;

-- 5) Nested subquery: customers who spent above average customer spend.
SELECT
    outer_q.user_id,
    outer_q.full_name,
    outer_q.customer_spend
FROM (
    SELECT
        u.user_id,
        u.full_name,
        COALESCE(SUM(o.total_amount), 0) AS customer_spend
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.user_id AND o.order_status IN ('PLACED', 'COMPLETED')
    GROUP BY u.user_id, u.full_name
) AS outer_q
WHERE outer_q.customer_spend > (
    SELECT AVG(inner_q.customer_spend)
    FROM (
        SELECT
            u2.user_id,
            COALESCE(SUM(o2.total_amount), 0) AS customer_spend
        FROM users u2
        LEFT JOIN orders o2 ON o2.user_id = u2.user_id AND o2.order_status IN ('PLACED', 'COMPLETED')
        GROUP BY u2.user_id
    ) AS inner_q
)
ORDER BY outer_q.customer_spend DESC;

-- 6) Trigger/audit demo query: latest inventory and order status audits.
SELECT
    ia.audit_id,
    ia.product_id,
    ia.old_stock,
    ia.new_stock,
    ia.change_qty,
    ia.reason,
    ia.changed_at
FROM inventory_audit ia
ORDER BY ia.changed_at DESC
LIMIT 20;

SELECT
    oa.audit_id,
    oa.order_id,
    oa.old_status,
    oa.new_status,
    oa.note,
    oa.changed_at
FROM order_audit oa
ORDER BY oa.changed_at DESC
LIMIT 20;

-- 7) Admin summary snapshot.
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COUNT(*) FROM orders WHERE order_status = 'PLACED') AS placed_orders,
    (SELECT COUNT(*) FROM orders WHERE order_status = 'COMPLETED') AS completed_orders,
    (SELECT COUNT(*) FROM orders WHERE order_status = 'CANCELLED') AS cancelled_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE order_status IN ('PLACED', 'COMPLETED')) AS gross_revenue;

-- 8) Explicit cursor usage demo (OPEN/FETCH/CLOSE inside function).
SELECT * FROM cursor_low_stock_products();
