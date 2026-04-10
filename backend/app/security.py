import base64
import hashlib
import hmac
import os
import secrets

ALGO = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 240000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        DEFAULT_ITERATIONS,
    )
    encoded_salt = base64.b64encode(salt).decode("ascii")
    encoded_key = base64.b64encode(derived_key).decode("ascii")
    return f"{ALGO}${DEFAULT_ITERATIONS}${encoded_salt}${encoded_key}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algo, iterations_str, encoded_salt, encoded_key = hashed_password.split("$", 3)
        if algo != ALGO:
            return False
        iterations = int(iterations_str)
        salt = base64.b64decode(encoded_salt.encode("ascii"))
        expected_key = base64.b64decode(encoded_key.encode("ascii"))
    except Exception:
        return False

    provided_key = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(provided_key, expected_key)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str, secret: str) -> str:
    return hashlib.sha256(f"{token}:{secret}".encode("utf-8")).hexdigest()
