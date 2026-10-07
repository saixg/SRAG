from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from srag.settings import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])
ALLOWED_ROLES = {"EMPLOYEE", "MANAGER", "PEOPLE_OPS", "ADMINISTRATOR"}


class PasswordLogin(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


def _allowed_origins() -> set[str]:
    return {
        origin.strip().rstrip("/")
        for origin in get_settings().cors_origins.split(",")
        if origin.strip()
    }


def _require_origin(request: Request) -> None:
    origin = request.headers.get("origin", "").rstrip("/")
    if not origin or origin not in _allowed_origins():
        raise HTTPException(
            status_code=403,
            detail="This sign-in request did not come from an approved portal origin.",
        )


def _secret() -> bytes:
    value = get_settings().secret_key.get_secret_value()
    if not value or value == "CHANGE_ME_GENERATE_A_REAL_SECRET":
        raise HTTPException(
            status_code=503, detail="Company sign-in is not configured on this server."
        )
    return value.encode("utf-8")


def _encode_session(claims: dict[str, Any]) -> str:
    payload = base64.urlsafe_b64encode(json.dumps(claims, separators=(",", ":")).encode()).rstrip(
        b"="
    )
    signature = hmac.new(_secret(), payload, hashlib.sha256).digest()
    return payload.decode() + "." + base64.urlsafe_b64encode(signature).rstrip(b"=").decode()


def _decode_session(value: str) -> dict[str, Any] | None:
    try:
        payload_text, signature_text = value.split(".", 1)
        payload = payload_text.encode()
        signature = base64.urlsafe_b64decode(signature_text + "=" * (-len(signature_text) % 4))
        expected = hmac.new(_secret(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            return None
        claims = json.loads(base64.urlsafe_b64decode(payload_text + "=" * (-len(payload_text) % 4)))
        if not isinstance(claims, dict) or int(claims.get("exp", 0)) <= int(time.time()):
            return None
        return claims
    except (ValueError, TypeError, json.JSONDecodeError, HTTPException):
        return None


def _accounts() -> list[dict[str, Any]]:
    try:
        rows = json.loads(get_settings().portal_users_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=503, detail="Employee sign-in accounts are not configured correctly."
        ) from None
    if not isinstance(rows, list):
        raise HTTPException(
            status_code=503, detail="Employee sign-in accounts are not configured correctly."
        )
    return [row for row in rows if isinstance(row, dict)]


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded.split("$", 3)
        iterations = int(iterations_text)
        if algorithm != "pbkdf2_sha256" or not 100_000 <= iterations <= 2_000_000:
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _public_user(claims: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(claims["sub"]),
        "name": str(claims.get("name") or claims.get("email", "Employee").split("@")[0]),
        "email": str(claims["email"]),
        "role": str(claims.get("role", "EMPLOYEE")),
        "roleTitle": str(claims.get("roleTitle", "Employee")),
        "department": str(claims.get("department", "")),
        "location": str(claims.get("location", "")),
        "employeeId": str(claims.get("employeeId", claims["sub"])),
        "manager": str(claims.get("manager", "")),
        "joinedDate": str(claims.get("joinedDate", "")),
        "avatarUrl": str(claims.get("avatarUrl", "")),
        "status": "ONLINE",
    }


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_session_cookie_name,
        value=token,
        max_age=settings.auth_session_max_age_seconds,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


@router.post("/login", summary="Authenticate an employee with username and password")
async def password_login(
    body: PasswordLogin, request: Request, response: Response
) -> dict[str, Any]:
    _require_origin(request)
    _secret()
    accounts = _accounts()
    username = body.username.strip().casefold()
    matched: dict[str, Any] | None = None
    valid = False
    for account in accounts:
        account_names = {
            str(account.get("username", "")).strip().casefold(),
            str(account.get("email", "")).strip().casefold(),
        }
        if username in account_names:
            candidate_ok = _verify_password(body.password, str(account.get("password_hash", "")))
            role = account.get("role", "EMPLOYEE")
            record_valid = (
                all(account.get(key) for key in ("id", "name", "email", "password_hash"))
                and role in ALLOWED_ROLES
            )
            valid = candidate_ok and record_valid
            matched = account if valid else None
            break
    if matched is None:
        hashlib.pbkdf2_hmac("sha256", body.password.encode(), b"nexus-one-dummy-salt", 600_000)
    if not valid or matched is None:
        raise HTTPException(status_code=401, detail="The username or password is incorrect.")

    now = int(time.time())
    claims: dict[str, Any] = {
        "sub": str(matched["id"]),
        "email": str(matched["email"]),
        "name": matched["name"],
        "role": matched.get("role", "EMPLOYEE"),
        "roleTitle": matched.get("roleTitle", "Employee"),
        "department": matched.get("department", ""),
        "location": matched.get("location", ""),
        "employeeId": matched.get("employeeId", matched["id"]),
        "manager": matched.get("manager", ""),
        "joinedDate": matched.get("joinedDate", ""),
        "avatarUrl": matched.get("avatarUrl", ""),
        "iat": now,
        "exp": now + get_settings().auth_session_max_age_seconds,
        "nonce": secrets.token_urlsafe(12),
    }
    _set_session_cookie(response, _encode_session(claims))
    return {"user": _public_user(claims)}


@router.get("/session", summary="Get the current authenticated employee")
async def get_session(request: Request) -> dict[str, Any]:
    settings = get_settings()
    raw = request.cookies.get(settings.auth_session_cookie_name)
    claims = _decode_session(raw) if raw else None
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No active company session."
        )
    return {"user": _public_user(claims)}


@router.post("/logout", summary="End the current session")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    _require_origin(request)
    settings = get_settings()
    response.delete_cookie(
        settings.auth_session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
    return {"ok": True}
