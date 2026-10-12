"""The security scope carried by a document and stamped onto its evidence.

An empty scope means any authenticated member of the tenant may see the unit;
a non-empty scope fails closed unless the caller holds a required role or
collection. See srag.authz.role_allows, which is the only consumer of the
shape this module produces.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


def _clean(values: list[str]) -> list[str]:
    """Strip, drop blanks, de-duplicate, preserve order."""
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        label = value.strip()
        if not label or label.casefold() in seen:
            continue
        seen.add(label.casefold())
        cleaned.append(label)
    return cleaned


class SecurityScope(BaseModel):
    """Roles and collections required to see a document's evidence."""

    model_config = {"extra": "forbid"}

    roles: list[str] = Field(default_factory=list)
    collections: list[str] = Field(default_factory=list)

    @field_validator("roles", "collections")
    @classmethod
    def normalize(cls, value: list[str]) -> list[str]:
        return _clean(value)

    @property
    def is_open(self) -> bool:
        return not self.roles and not self.collections

    def as_dict(self) -> dict[str, Any]:
        """The persisted form.

        Empty keys are omitted rather than stored as empty lists, so that an
        open scope is exactly {} and role_allows short-circuits on it.
        """
        scope: dict[str, Any] = {}
        if self.roles:
            scope["roles"] = self.roles
        if self.collections:
            scope["collections"] = self.collections
        return scope


def scope_from_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    """Read the persisted ACL off a document's metadata.

    Returns {} for a missing or malformed value. That is the open scope, which
    is safe here because the ACL is written only by validated API paths; a
    malformed value means no ACL was ever set, not that one was dropped.
    """
    acl = (metadata or {}).get("acl")
    return acl if isinstance(acl, dict) else {}
