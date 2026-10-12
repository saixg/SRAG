"""Role and collection checks. Tenant isolation stays in Postgres RLS.

Empty scope means any authenticated member of the tenant may see the unit.
A non-empty scope fails closed unless the caller holds a required role or
collection. Admin satisfies both checks.
"""

from __future__ import annotations

from typing import Any


def _labels(values: object) -> set[str]:
    if not isinstance(values, list):
        return set()
    return {str(value).casefold() for value in values if str(value).strip()}


def role_allows(
    roles: list[str] | None,
    collections: list[str] | None,
    security_scope: dict[str, Any] | None,
) -> bool:
    scope = security_scope or {}
    required_roles = scope.get("roles")
    required_collections = scope.get("collections")
    if not required_roles and not required_collections:
        return True

    granted_roles = _labels(roles or [])
    if "admin" in granted_roles:
        return True

    if required_roles and (
        not isinstance(required_roles, list) or not _labels(required_roles) & granted_roles
    ):
        return False
    if required_collections:
        granted_collections = _labels(collections or [])
        if not isinstance(required_collections, list) or not (
            _labels(required_collections) & granted_collections
        ):
            return False
    return True


def scope_cache_key(roles: list[str] | None, collections: list[str] | None) -> str:
    role_part = ",".join(sorted(_labels(roles or [])))
    collection_part = ",".join(sorted(_labels(collections or [])))
    return f"{role_part}|{collection_part}"
