"""Docling integration for layout-aware PDF extraction."""

from __future__ import annotations

import io
import logging
from typing import Any

from srag.contracts.evidence import EvidenceType
from srag.ingestion.parsers.layout import (
    bbox_from_docling,
    first_prov,
    structured_table,
    table_text,
)
from srag.ingestion.parsers.visual import classify_visual, visual_caption

logger = logging.getLogger(__name__)


def _build_converter(document_converter_cls: Any) -> Any:
    """A DocumentConverter configured to materialize picture images.

    Takes the already-imported DocumentConverter class, so a missing Docling
    install still raises RuntimeError as before. Everything past that import
    is best-effort: a version mismatch on the picture-image options (renamed
    attribute, moved module) falls back to the plain converter, which still
    extracts text and tables — only picture images become caption-only.
    """
    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import PdfFormatOption

        pipeline_options = PdfPipelineOptions()
        pipeline_options.generate_picture_images = True
        pipeline_options.images_scale = 2.0
        return document_converter_cls(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
        )
    except Exception:
        logger.warning("picture-image pipeline unavailable; using default converter", exc_info=True)
        return document_converter_cls()


def _picture_image_bytes(document: Any, index: int) -> bytes | None:
    """PNG bytes for one picture, or None if it can't be rendered.

    Broad except by design: an unrelated Docling version may not expose
    get_image, may return None for a picture with no raster data, or may
    raise from Pillow while encoding — none of that should abort ingestion
    of the rest of the document, only leave this one figure caption-only.
    """
    try:
        pictures = document.pictures
        image = pictures[index].get_image(document)
        if image is None:
            return None
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()
    except Exception:
        logger.warning("picture image unavailable", extra={"index": index}, exc_info=True)
        return None


def extract_with_docling(file_path: str, filename: str) -> list[dict[str, Any]]:
    try:
        from docling.document_converter import DocumentConverter
    except ImportError as exc:
        raise RuntimeError("Docling is not installed") from exc

    result = _build_converter(DocumentConverter).convert(file_path)
    doc_dict = result.document.export_to_dict()
    candidates: list[dict[str, Any]] = []

    for idx, text_item in enumerate(doc_dict.get("texts") or []):
        content = (text_item.get("text") or "").strip()
        if not content:
            continue
        candidates.append(
            _candidate(filename, f"text_{idx}", EvidenceType.TEXT.value, text_item, content)
        )

    for idx, table_item in enumerate(doc_dict.get("tables") or []):
        structured = structured_table(table_item, idx)
        candidates.append(
            _candidate(
                filename,
                f"table_{idx}",
                EvidenceType.TABLE.value,
                table_item,
                table_text(table_item, idx),
                structured=structured,
                method="docling_table",
            )
        )

    for idx, pic_item in enumerate(doc_dict.get("pictures") or []):
        caption = (pic_item.get("text") or pic_item.get("caption") or "").strip()
        element_type = classify_visual(caption)
        text_content = visual_caption(caption)
        prov = first_prov(pic_item)
        page_no = prov.get("page_no")
        picture_structured: dict[str, Any] = {"caption": caption or None, "kind": element_type}
        image_bytes = _picture_image_bytes(result.document, idx)
        if image_bytes is not None:
            picture_structured["content_type"] = "image/png"
        picture_candidate = _candidate(
            filename,
            f"{element_type}_{idx}",
            element_type,
            pic_item,
            text_content,
            structured=picture_structured,
            visual_reference_id=f"{filename}_page_{page_no}_{element_type}_{idx}",
            method=f"docling_{element_type}",
        )
        if image_bytes is not None:
            picture_candidate["image_bytes"] = image_bytes
        candidates.append(picture_candidate)

    return candidates


def _candidate(
    filename: str,
    element_id: str,
    element_type: str,
    item: dict[str, Any],
    text_content: str | None,
    *,
    structured: dict[str, Any] | None = None,
    visual_reference_id: str | None = None,
    method: str | None = None,
) -> dict[str, Any]:
    prov = first_prov(item)
    page_no = prov.get("page_no")
    bbox = bbox_from_docling(prov.get("bbox"))
    return {
        "element_id": element_id,
        "element_type": element_type,
        "text_content": text_content,
        "structured_content": structured,
        "visual_reference_id": visual_reference_id,
        "page_id": str(page_no) if page_no is not None else None,
        "source_location": {
            "page_number": page_no,
            "bbox": bbox,
            "coordinate_system": "docling_absolute" if bbox else None,
        },
        "provenance": {
            "source_filename": filename,
            "extraction_method": method or f"docling_{element_type}",
        },
    }
