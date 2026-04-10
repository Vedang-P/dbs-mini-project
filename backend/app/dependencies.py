from typing import Any

from fastapi import Header, HTTPException

from .config import AUTH_TOKEN_SECRET
from .db import get_connection
from .repositories import get_user_session_by_token_hash
from .security import hash_session_token


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required.")

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Invalid authorization token format.")
    return parts[1].strip()


def get_current_session(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = extract_bearer_token(authorization)
    token_hash = hash_session_token(token, AUTH_TOKEN_SECRET)

    with get_connection() as conn:
        with conn.transaction():
            session = get_user_session_by_token_hash(conn, token_hash=token_hash)
            if session is None:
                raise HTTPException(status_code=401, detail="Session is invalid or expired.")
            if not session["is_active"]:
                raise HTTPException(status_code=403, detail="User account is inactive.")
            return {
                "token_hash": token_hash,
                "user": {
                    "user_id": session["user_id"],
                    "name": session["full_name"],
                    "email": session["email"],
                    "is_admin": session["is_admin"],
                },
            }


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    session = get_current_session(authorization)
    return session["user"]


def get_admin_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization)
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user
