"""PaddleOCR integration for image text extraction."""

from __future__ import annotations

import logging
from typing import Any

from srag.contracts.evidence import EvidenceType

logger = logging.getLogger(__name__)


def extract_with_ocr(file_path: str, filename: str) -> list[dict[str, Any]]:
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise RuntimeError("PaddleOCR is not installed") from exc

    ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    result = ocr.ocr(file_path, cls=True)
    if not result or not result[0]:
        return []

    candidates: list[dict[str, Any]] = []
    for idx, line in enumerate(result[0]):
        box = line[0]
        text_content, confidence = line[1]
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        bbox = [min(xs), min(ys), max(xs), max(ys)]
        candidates.append(
            {
                "element_id": f"ocr_{idx}",
                "element_type": EvidenceType.OCR.value,
                "text_content": text_content,
                "page_id": "1",
                "source_location": {
                    "page_number": 1,
                    "bbox": bbox,
                    "coordinate_system": "pixel",
                },
                "provenance": {
                    "source_filename": filename,
                    "extraction_method": "paddleocr",
                    "confidence": confidence,
                },
            }
        )
    return candidates
