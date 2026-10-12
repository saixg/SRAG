"""Tenant-scoped retrieval cache. Keys always include tenant_id and ACL scope."""

from __future__ import annotations

import json
from collections import OrderedDict
from typing import Any, Protocol


class QueryCache(Protocol):
    def get(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        types: str = "",
        roles: str = "",
    ) -> Any | None: ...

    def set(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        value: Any,
        types: str = "",
        roles: str = "",
    ) -> None: ...


class TenantQueryCache:
    def __init__(self, max_entries: int = 256) -> None:
        self._max = max_entries
        self._store: OrderedDict[tuple[str, str, int, str, str], Any] = OrderedDict()

    def get(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        types: str = "",
        roles: str = "",
    ) -> Any | None:
        key = self._key(tenant_id, query, top_k, types, roles)
        value = self._store.get(key)
        if value is not None:
            self._store.move_to_end(key)
        return value

    def set(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        value: Any,
        types: str = "",
        roles: str = "",
    ) -> None:
        key = self._key(tenant_id, query, top_k, types, roles)
        self._store[key] = value
        self._store.move_to_end(key)
        while len(self._store) > self._max:
            self._store.popitem(last=False)

    @staticmethod
    def _key(
        tenant_id: object, query: str, top_k: int, types: str, roles: str
    ) -> tuple[str, str, int, str, str]:
        return (str(tenant_id), " ".join(query.casefold().split()), top_k, types, roles)


class DisabledQueryCache:
    """No process-local hits. Safe for multi-instance deployments."""

    def get(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        types: str = "",
        roles: str = "",
    ) -> None:
        return None

    def set(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        value: Any,
        types: str = "",
        roles: str = "",
    ) -> None:
        return None


class RedisQueryCache:
    """Shared cache. Values are JSON so a hit cannot cross processes as pickle."""

    def __init__(self, client: Any, ttl_seconds: int = 120) -> None:
        self._client = client
        self._ttl = ttl_seconds

    @classmethod
    def connect(cls, url: str) -> RedisQueryCache:
        import redis

        client = redis.Redis.from_url(url, decode_responses=True, socket_timeout=1)
        return cls(client)

    def get(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        types: str = "",
        roles: str = "",
    ) -> Any | None:
        raw = self._client.get(self._redis_key(tenant_id, query, top_k, types, roles))
        if raw is None:
            return None
        return _decode(raw)

    def set(
        self,
        tenant_id: object,
        query: str,
        top_k: int,
        value: Any,
        types: str = "",
        roles: str = "",
    ) -> None:
        self._client.set(
            self._redis_key(tenant_id, query, top_k, types, roles),
            _encode(value),
            ex=self._ttl,
        )

    @staticmethod
    def _redis_key(tenant_id: object, query: str, top_k: int, types: str, roles: str) -> str:
        normalized = " ".join(query.casefold().split())
        return f"srag:q:{tenant_id}:{top_k}:{types}:{roles}:{normalized}"


def build_query_cache() -> TenantQueryCache | DisabledQueryCache | RedisQueryCache:
    from srag.settings import CacheBackend, get_settings

    settings = get_settings()
    if settings.cache_backend == CacheBackend.DISABLED:
        return DisabledQueryCache()
    if settings.cache_backend == CacheBackend.REDIS:
        if not settings.redis_url:
            raise RuntimeError("REDIS_URL is required when CACHE_BACKEND=redis")
        return RedisQueryCache.connect(settings.redis_url)
    return TenantQueryCache()


def _encode(value: Any) -> str:
    if isinstance(value, list) and (not value or hasattr(value[0], "evidence")):
        payload = {
            "kind": "hits",
            "hits": [
                {"score": item.score, "evidence": item.evidence.model_dump(mode="json")}
                for item in value
            ],
        }
        return json.dumps(payload)
    return json.dumps({"kind": "raw", "value": value})


def _decode(raw: str) -> Any:
    from srag.contracts.evidence import EvidenceUnit
    from srag.retrieval.types import SearchResult

    payload = json.loads(raw)
    if payload.get("kind") == "hits":
        return [
            SearchResult(
                evidence=EvidenceUnit.model_validate(item["evidence"]),
                score=float(item["score"]),
            )
            for item in payload["hits"]
        ]
    return payload["value"]
