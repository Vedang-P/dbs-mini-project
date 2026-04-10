from typing import Any

import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import API_TITLE, AUTH_TOKEN_SECRET
from .db import get_connection
from .dependencies import get_admin_user, get_current_session, get_current_user
from .repositories import (
    add_to_cart,
    create_session,
    get_admin_audit,
    get_admin_low_stock,
    get_admin_summary,
    get_admin_top_products,
    get_order_by_id,
    get_user_session_by_token_hash,
    list_categories,
    remove_cart_item,
    revoke_session_by_token_hash,
    update_cart_item_quantity,
    cancel_order,
    create_user,
    get_cart,
    get_orders,
    get_products,
    get_user_by_email,
    place_order,
)
from .schemas import (
    AddToCartRequest,
    CancelOrderRequest,
    LegacyAddToCartRequest,
    LoginRequest,
    PlaceOrderRequest,
    RegisterRequest,
    UpdateCartItemRequest,
)
from .security import hash_password, hash_session_token, verify_password

app = FastAPI(title=API_TITLE, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_user_id(
    *,
    authorization: str | None,
    fallback_user_id: int | None,
    require_auth: bool = False,
) -> int:
    if authorization:
        parts = authorization.strip().split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization token format.")
        token_hash = hash_session_token(parts[1].strip(), AUTH_TOKEN_SECRET)
        with get_connection() as conn:
            with conn.transaction():
                session = get_user_session_by_token_hash(conn, token_hash=token_hash)
                if session is None:
                    raise HTTPException(status_code=401, detail="Session is invalid or expired.")
                return int(session["user_id"])

    if fallback_user_id is not None:
        return fallback_user_id

    if require_auth:
        raise HTTPException(status_code=401, detail="Authentication required.")
    raise HTTPException(status_code=400, detail="user_id is required.")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Shopping Cart API is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register")
@app.post("/users/register")
def register_user(payload: RegisterRequest) -> dict:
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    with get_connection() as conn:
        try:
            with conn.transaction():
                user = create_user(
                    conn,
                    name=payload.name,
                    email=payload.email,
                    password_hash=hash_password(payload.password),
                    phone=payload.phone,
                )
                return {
                    "message": "User registered successfully",
                    "user": user,
                }
        except psycopg.errors.UniqueViolation:
            raise HTTPException(status_code=409, detail="Email already registered.") from None
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login")
@app.post("/users/login")
def login_user(payload: LoginRequest) -> dict:
    with get_connection() as conn:
        with conn.transaction():
            user = get_user_by_email(conn, email=payload.email)
            if user is None:
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            if not verify_password(payload.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            if not user["is_active"]:
                raise HTTPException(status_code=403, detail="User account is inactive.")

            session = create_session(conn, user_id=user["user_id"])

            return {
                "message": "Login successful",
                "access_token": session["access_token"],
                "expires_at": session["expires_at"],
                "user": {
                    "user_id": user["user_id"],
                    "name": user["full_name"],
                    "email": user["email"],
                    "is_admin": user["is_admin"],
                },
                # Legacy compatibility
                "user_id": user["user_id"],
                "name": user["full_name"],
                "email": user["email"],
            }


@app.post("/auth/logout")
def logout_user(session: dict[str, Any] = Depends(get_current_session)) -> dict[str, str]:
    with get_connection() as conn:
        with conn.transaction():
            revoke_session_by_token_hash(conn, token_hash=session["token_hash"])
    return {"message": "Logged out successfully"}


@app.get("/auth/me")
def auth_me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict:
    return {"user": current_user}


@app.get("/categories")
def categories() -> dict:
    with get_connection() as conn:
        data = list_categories(conn)
        return {"count": len(data), "categories": data}


@app.get("/products")
def list_products(
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    in_stock_only: bool = Query(default=False),
    sort: str | None = Query(default="name_asc"),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
) -> dict:
    with get_connection() as conn:
        products = get_products(
            conn,
            category_id=category_id,
            search=search,
            in_stock_only=in_stock_only,
            sort=sort,
            min_price=min_price,
            max_price=max_price,
        )
        return {"count": len(products), "products": products}


@app.post("/cart/items")
def add_cart_item(
    payload: AddToCartRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                result = add_to_cart(
                    conn,
                    user_id=current_user["user_id"],
                    product_id=payload.product_id,
                    quantity=payload.quantity,
                )
                return {"message": "Item added to cart", "result": result}
        except (psycopg.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/cart")
def add_item_to_cart_legacy(payload: LegacyAddToCartRequest) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                result = add_to_cart(
                    conn,
                    user_id=payload.user_id,
                    product_id=payload.product_id,
                    quantity=payload.quantity,
                )
                return {"message": "Item added to cart", "result": result}
        except (psycopg.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/cart")
def view_cart(
    user_id: int | None = Query(default=None, gt=0),
    authorization: str | None = Header(default=None),
) -> dict:
    resolved_user_id = _resolve_user_id(
        authorization=authorization,
        fallback_user_id=user_id,
        require_auth=False,
    )
    with get_connection() as conn:
        return get_cart(conn, user_id=resolved_user_id)


@app.patch("/cart/items/{cart_item_id}")
def set_cart_item_quantity(
    cart_item_id: int,
    payload: UpdateCartItemRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                updated = update_cart_item_quantity(
                    conn,
                    user_id=current_user["user_id"],
                    cart_item_id=cart_item_id,
                    quantity=payload.quantity,
                )
                return {"message": "Cart quantity updated", "item": updated}
        except (psycopg.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/cart/items/{cart_item_id}")
def delete_cart_item(
    cart_item_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict:
    with get_connection() as conn:
        with conn.transaction():
            deleted = remove_cart_item(
                conn,
                user_id=current_user["user_id"],
                cart_item_id=cart_item_id,
            )
            if not deleted:
                raise HTTPException(status_code=404, detail="Cart item not found.")
            return {"message": "Cart item removed"}


@app.post("/orders")
@app.post("/order")
def create_order(
    payload: PlaceOrderRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    resolved_user_id = _resolve_user_id(
        authorization=authorization,
        fallback_user_id=payload.user_id,
        require_auth=False,
    )
    with get_connection() as conn:
        try:
            with conn.transaction():
                order_id = place_order(conn, user_id=resolved_user_id)
                return {"message": "Order placed successfully", "order_id": order_id}
        except (psycopg.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/orders")
def list_user_orders(
    user_id: int | None = Query(default=None, gt=0),
    authorization: str | None = Header(default=None),
) -> dict:
    resolved_user_id = _resolve_user_id(
        authorization=authorization,
        fallback_user_id=user_id,
        require_auth=False,
    )
    with get_connection() as conn:
        orders = get_orders(conn, user_id=resolved_user_id)
        return {"count": len(orders), "orders": orders}


@app.get("/orders/{order_id}")
def get_order(order_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        order = get_order_by_id(
            conn,
            user_id=current_user["user_id"],
            order_id=order_id,
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        return {"order": order}


@app.post("/orders/{order_id}/cancel")
def cancel_user_order(
    order_id: int,
    payload: CancelOrderRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    resolved_user_id = _resolve_user_id(
        authorization=authorization,
        fallback_user_id=payload.user_id,
        require_auth=False,
    )
    with get_connection() as conn:
        try:
            with conn.transaction():
                cancelled = cancel_order(
                    conn,
                    order_id=order_id,
                    user_id=resolved_user_id,
                )
                if not cancelled:
                    raise HTTPException(status_code=400, detail="Order cancellation failed.")
                return {"message": "Order cancelled successfully", "order_id": order_id}
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/summary")
def admin_summary(_: dict[str, Any] = Depends(get_admin_user)) -> dict:
    with get_connection() as conn:
        return {"summary": get_admin_summary(conn)}


@app.get("/admin/low-stock")
def admin_low_stock(_: dict[str, Any] = Depends(get_admin_user)) -> dict:
    with get_connection() as conn:
        data = get_admin_low_stock(conn)
        return {"count": len(data), "products": data}


@app.get("/admin/top-products")
def admin_top_products(_: dict[str, Any] = Depends(get_admin_user)) -> dict:
    with get_connection() as conn:
        data = get_admin_top_products(conn)
        return {"count": len(data), "products": data}


@app.get("/admin/audit")
def admin_audit(_: dict[str, Any] = Depends(get_admin_user)) -> dict:
    with get_connection() as conn:
        return get_admin_audit(conn)
