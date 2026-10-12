"""Fixed-window rate limits for query and upload routes."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, status


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def reset(self) -> None:
        self._hits.clear()

    def check(self, key: str, limit: int) -> None:
        now = time.monotonic()
        window = [stamp for stamp in self._hits[key] if now - stamp < 60]
        if len(window) >= limit:
            self._hits[key] = window
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )
        window.append(now)
        self._hits[key] = window


_limiter = SlidingWindowLimiter()


def get_limiter() -> SlidingWindowLimiter:
    return _limiter
