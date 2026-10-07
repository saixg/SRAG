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
from pydantic_settings import BaseSettings
from google.auth import exceptions as google_auth_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from srag.settings import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=20, max_length=8192)


def _allowed_origins() -> set[str]:
    return {origin.strip().rstrip("/") for origin in get_settings().cors_origins.split(",") if origin.strip()}


def _require_origin(request: Request) -> None:
    origin = request.headers.get("origin", "").rstrip("/")
    if not origin or origin not in _allowed_origins():
        raise HTTPException(status_code=403, detail="This sign-in request did not come from an approved portal origin.")


def _secret() -> bytes:
    value = get_settings().secret_key.get_secret_value()
    if not value or value == "CHANGE_ME_GENERATE_A_REAL_SECRET":
        raise HTTPException(status_code=503, detail="Company sign-in is not configured on this server.")
    return value.encode("utf-8")


def _encode_session(claims: dict[str, Any]) -> str:
    payload = base64.urlsafe_b64encode(json.dumps(claims, separators=(",", ":")).encode()).rstrip(b"=")
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


def _public_user(claims: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(claims["sub"]),
        "name": str(claims.get("name") or claims.get("email", "Employee").split("@")[0]),
        "email": str(claims["email"]),
        "role": "EMPLOYEE",
        "roleTitle": "Employee",
        "department": "Nexus Technologies",
        "location": "",
        "employeeId": str(claims["sub"]),
        "manager": "",
        "joinedDate": "",
        "avatarUrl": str(claims.get("picture") or ""),
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


@router.post("/google", summary="Verify a Google Workspace credential")
async def google_login(body: GoogleCredential, request: Request, response: Response) -> dict[str, Any]:
    _require_origin(request)
    settings = get_settings()
    if not settings.google_client_id or not settings.google_hosted_domain:
        raise HTTPException(status_code=503, detail="Company Google sign-in is not configured on this server.")
    try:
        claims = id_token.verify_oauth2_token(body.credential, google_requests.Request(), settings.google_client_id)
    except (ValueError, google_auth_exceptions.GoogleAuthError):
        raise HTTPException(status_code=401, detail="Google could not verify this sign-in. Please try again.") from None
    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="The Google sign-in issuer is invalid.")
    email = str(claims.get("email", ""))
    hosted_domain = str(claims.get("hd", "")).lower()
    if not claims.get("email_verified") or not email or not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Use a verified company Google account to sign in.")
    if hosted_domain != settings.google_hosted_domain.lower():
        raise HTTPException(status_code=403, detail="Sign in with your company's Google Workspace account.")
    now = int(time.time())
    session_claims = {
        "sub": str(claims["sub"]), "email": email, "name": claims.get("name"),
        "picture": claims.get("picture"), "iat": now,
        "exp": now + settings.auth_session_max_age_seconds,
        "nonce": secrets.token_urlsafe(12),
    }
    _set_session_cookie(response, _encode_session(session_claims))
    return {"user": _public_user(session_claims)}


@router.get("/session", summary="Get the current authenticated employee")
async def get_session(request: Request) -> dict[str, Any]:
    settings = get_settings()
    raw = request.cookies.get(settings.auth_session_cookie_name)
    claims = _decode_session(raw) if raw else None
    if claims is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active company session.")
    return {"user": _public_user(claims)}


@router.post("/logout", summary="End the current session")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    _require_origin(request)
    settings = get_settings()
    response.delete_cookie(settings.auth_session_cookie_name, path="/", httponly=True, secure=settings.is_production, samesite="lax")
    return {"ok": True}
