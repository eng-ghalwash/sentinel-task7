import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import pyotp
from jose import jwt

from app.config import settings

DEMO_PASSWORD = "sentinel123"

# Demo users for Task 7 (password for all: sentinel123)
DEMO_USERS = {
    "admin": {
        "id": "u-admin",
        "username": "admin",
        "full_name": "Mostafa Admin",
        "role": "Admin",
    },
    "analyst": {
        "id": "u-analyst",
        "username": "analyst",
        "full_name": "SOC Analyst",
        "role": "Analyst",
    },
    "auditor": {
        "id": "u-auditor",
        "username": "auditor",
        "full_name": "Compliance Auditor",
        "role": "Auditor",
    },
    "client": {
        "id": "u-client",
        "username": "client",
        "full_name": "Skyline Client",
        "role": "Client",
    },
}

# Mutable TOTP state: username -> {secret, enabled}
TOTP_STATE: dict[str, dict] = {
    name: {"secret": None, "enabled": False} for name in DEMO_USERS
}


def _password_digest(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain: str, expected: str = DEMO_PASSWORD) -> bool:
    return hmac.compare_digest(_password_digest(plain), _password_digest(expected))


def authenticate_user(username: str, password: str) -> dict | None:
    user = DEMO_USERS.get(username)
    if not user or not verify_password(password):
        return None
    return user


def is_totp_enabled(username: str) -> bool:
    state = TOTP_STATE.get(username)
    return bool(state and state.get("enabled") and state.get("secret"))


def verify_totp(username: str, code: str | None) -> bool:
    state = TOTP_STATE.get(username)
    if not state or not state.get("enabled") or not state.get("secret"):
        return True
    if not code:
        return False
    totp = pyotp.TOTP(state["secret"])
    return totp.verify(code.strip(), valid_window=1)


def begin_totp_setup(username: str) -> dict:
    secret = pyotp.random_base32()
    TOTP_STATE[username] = {"secret": secret, "enabled": False}
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=username, issuer_name="Sentinel")
    return {"secret": secret, "otpauth_url": otpauth_url}


def enable_totp(username: str, code: str) -> bool:
    state = TOTP_STATE.get(username)
    if not state or not state.get("secret"):
        return False
    totp = pyotp.TOTP(state["secret"])
    if not totp.verify(code.strip(), valid_window=1):
        return False
    state["enabled"] = True
    return True


def disable_totp(username: str) -> None:
    TOTP_STATE[username] = {"secret": None, "enabled": False}


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def get_user_public(username: str) -> dict | None:
    user = DEMO_USERS.get(username)
    if not user:
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "totp_enabled": is_totp_enabled(username),
    }


def list_users_public() -> list[dict]:
    return [get_user_public(name) for name in DEMO_USERS]  # type: ignore[misc]
