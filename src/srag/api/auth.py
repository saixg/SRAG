from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from srag.db.models import EmployeeAccount
from srag.db.session import get_db_session
from srag.settings import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])
PBKDF2_ITERATIONS = 600_000
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]{3,80}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PasswordLogin(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class AccountRegistration(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=1024)
    invite_code: str = Field(min_length=1, max_length=128)


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


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded.split("$", 3)
        iterations = int(iterations_text)
        if algorithm != "pbkdf2_sha256" or not 100_000 <= iterations <= 2_000_000:
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), iterations
        )
        return hmac.compare_digest(actual, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


async def _find_account(session: AsyncSession, identifier: str) -> EmployeeAccount | None:
    normalized = identifier.strip().casefold()
    result = await session.execute(
        select(EmployeeAccount).where(
            or_(
                func.lower(EmployeeAccount.username) == normalized,
                func.lower(EmployeeAccount.email) == normalized,
            )
        )
    )
    return result.scalar_one_or_none()


def _public_user(account: EmployeeAccount) -> dict[str, str]:
    return {
        "id": str(account.id),
        "name": account.name,
        "email": account.email,
        "role": account.role,
        "roleTitle": account.role_title,
        "department": account.department,
        "location": account.location,
        "employeeId": account.employee_id or str(account.id),
        "manager": account.manager,
        "joinedDate": account.joined_date,
        "avatarUrl": account.avatar_url,
        "status": "ONLINE",
    }


def _session_claims(account: EmployeeAccount) -> dict[str, Any]:
    now = int(time.time())
    return {
        "sub": str(account.id),
        "email": account.email,
        "name": account.name,
        "role": account.role,
        "roleTitle": account.role_title,
        "department": account.department,
        "location": account.location,
        "employeeId": account.employee_id or str(account.id),
        "manager": account.manager,
        "joinedDate": account.joined_date,
        "avatarUrl": account.avatar_url,
        "iat": now,
        "exp": now + get_settings().auth_session_max_age_seconds,
        "nonce": secrets.token_urlsafe(12),
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


@router.post("/register", summary="Create an invited employee account")
async def register_account(
    body: AccountRegistration,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    _require_origin(request)
    _secret()
    invite_code = get_settings().portal_signup_invite_code.get_secret_value()
    if not invite_code or not hmac.compare_digest(body.invite_code, invite_code):
        raise HTTPException(
            status_code=403, detail="A valid company invitation code is required to register."
        )
    username = body.username.strip().lower()
    email = body.email.strip().lower()
    if not USERNAME_PATTERN.fullmatch(username):
        raise HTTPException(
            status_code=422,
            detail="Use 3-80 letters, numbers, dots, underscores, or hyphens for the username.",
        )
    if not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=422, detail="Enter a valid work email address.")
    if await _find_account(session, username) or await _find_account(session, email):
        raise HTTPException(status_code=409, detail="That username or email is already registered.")

    account = EmployeeAccount(
        username=username,
        email=email,
        name=body.name.strip(),
        password_hash=_hash_password(body.password),
        role="EMPLOYEE",
        role_title="Employee",
        employee_id=username,
    )
    session.add(account)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="That username or email is already registered."
        ) from None
    _set_session_cookie(response, _encode_session(_session_claims(account)))
    return {"user": _public_user(account)}


@router.post("/login", summary="Authenticate an employee with username and password")
async def password_login(
    body: PasswordLogin,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, Any]:
    _require_origin(request)
    _secret()
    account = await _find_account(session, body.username)
    if account is None:
        hashlib.pbkdf2_hmac(
            "sha256", body.password.encode(), b"nexus-one-dummy-salt", PBKDF2_ITERATIONS
        )
    if (
        account is None
        or not account.is_active
        or not _verify_password(body.password, account.password_hash)
    ):
        raise HTTPException(status_code=401, detail="The username or password is incorrect.")
    _set_session_cookie(response, _encode_session(_session_claims(account)))
    return {"user": _public_user(account)}


@router.get("/session", summary="Get the current authenticated employee")
async def get_session(
    request: Request, session: Annotated[AsyncSession, Depends(get_db_session)]
) -> dict[str, Any]:
    settings = get_settings()
    raw = request.cookies.get(settings.auth_session_cookie_name)
    claims = _decode_session(raw) if raw else None
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No active company session."
        )
    try:
        account_id = uuid.UUID(str(claims.get("sub", "")))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No active company session."
        ) from None
    account = await session.get(EmployeeAccount, account_id)
    if account is None or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No active company session."
        )
    return {"user": _public_user(account)}


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
