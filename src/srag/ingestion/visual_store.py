"""Local visual bytes keyed by visual_reference_id. Paths stay inside the store root."""

from __future__ import annotations

import re
from pathlib import Path

from srag.settings import get_settings

_SAFE = re.compile(r"[^A-Za-z0-9_-]")


def _safe_ref(visual_reference_id: str) -> str:
    cleaned = _SAFE.sub("", visual_reference_id)[:128]
    if not cleaned:
        raise ValueError("visual reference id is empty")
    return cleaned


def visual_path(tenant_id: object, visual_reference_id: str) -> Path:
    settings = get_settings()
    root = Path(settings.visual_store_dir).resolve()
    path = (root / str(tenant_id) / _safe_ref(visual_reference_id)).resolve()
    if root not in path.parents:
        raise ValueError("visual path escaped the store root")
    return path


def store_visual(tenant_id: object, visual_reference_id: str, payload: bytes) -> str:
    path = visual_path(tenant_id, visual_reference_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return path.name


def load_visual(tenant_id: object, visual_reference_id: str) -> bytes | None:
    path = visual_path(tenant_id, visual_reference_id)
    if not path.is_file():
        return None
    return path.read_bytes()
