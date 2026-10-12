"""Normalize parser provenance into source_location fields."""

from __future__ import annotations

from typing import Any


def bbox_from_docling(bbox: Any) -> list[float] | None:
    if not bbox:
        return None
    if isinstance(bbox, list) and all(isinstance(v, (int, float)) for v in bbox):
        return [float(v) for v in bbox]
    if isinstance(bbox, dict):
        if "coord" in bbox:
            return bbox_from_docling(bbox["coord"])
        keys = ("l", "t", "r", "b")
        if all(k in bbox for k in keys):
            return [float(bbox["l"]), float(bbox["t"]), float(bbox["r"]), float(bbox["b"])]
    return None


def first_prov(item: dict[str, Any]) -> dict[str, Any]:
    prov = item.get("prov") or [{}]
    if isinstance(prov, list) and prov:
        entry = prov[0]
        return entry if isinstance(entry, dict) else {}
    return {}


def _grid_rows(table_item: dict[str, Any]) -> list[list[str]]:
    data = table_item.get("data") or {}
    grid = data.get("grid") or data.get("table_cells")
    rows: list[list[str]] = []
    if not isinstance(grid, list):
        return rows
    for row in grid:
        if isinstance(row, list):
            cells: list[str] = []
            for cell in row:
                if isinstance(cell, dict):
                    cells.append(str(cell.get("text") or cell.get("value") or ""))
                else:
                    cells.append(str(cell))
            rows.append(cells)
        elif isinstance(row, dict):
            rows.append([str(row.get("text") or "")])
    return rows


def structured_table(table_item: dict[str, Any], index: int) -> dict[str, Any]:
    rows = _grid_rows(table_item)
    headers = rows[0] if rows else []
    body = rows[1:] if len(rows) > 1 else []
    return {
        "index": index,
        "headers": headers,
        "rows": body,
        "markdown": table_text(table_item, index),
    }


def table_text(table_item: dict[str, Any], index: int) -> str:
    rows = _grid_rows(table_item)
    if rows:
        rendered = "\n".join(" | ".join(row) for row in rows if any(cell.strip() for cell in row))
        if rendered:
            return rendered
    text = table_item.get("text")
    if isinstance(text, str) and text.strip():
        return text
    return f"Table {index}"
