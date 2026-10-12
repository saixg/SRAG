"""Optional Unstructured parser.

Kept behind metadata parser=unstructured. Docling and PaddleOCR are the
default path. This branch is not required for the pilot text or PDF flow.
"""

import logging
import os
from typing import Any

from srag.contracts.evidence import EvidenceType

logger = logging.getLogger(__name__)


def extract_with_unstructured(file_path: str, filename: str) -> list[dict[str, Any]]:
    """Parse a document using Unstructured API and yield EvidenceUnit candidates."""
    try:
        from unstructured.partition.auto import partition
    except ImportError as exc:
        raise RuntimeError("unstructured is not installed") from exc

    try:
        # Note: If UNSTRUCTURED_API_KEY is set, partition() can route to the API
        # Using the local unstructured library logic for demonstration of external services
        elements = partition(filename=file_path)
    except Exception as e:
        logger.error("Unstructured parsing failed for %s: %s", filename, e)
        raise

    candidates = []
    
    for idx, el in enumerate(elements):
        el_dict = el.to_dict()
        el_type = el_dict.get("type", "Text")
        text = el_dict.get("text", "")
        
        if not text.strip():
            continue
            
        metadata = el_dict.get("metadata", {})
        page_no = metadata.get("page_number")
        # Unstructured provides bounding box if requested (e.g. coordinates system)
        coordinates = metadata.get("coordinates", {})
        bbox = coordinates.get("points") if coordinates else None
        
        # Map unstructured types to our EvidenceType
        if el_type == "Table":
            evidence_type = EvidenceType.TABLE.value
        elif el_type == "Image":
            evidence_type = EvidenceType.IMAGE.value
        else:
            evidence_type = EvidenceType.TEXT.value
            
        candidates.append({
            "element_id": f"unstructured_{idx}",
            "element_type": evidence_type,
            "text_content": text,
            "structured_content": {"unstructured_type": el_type} if el_type == "Table" else None,
            "source_location": {
                "page_number": page_no,
                "bbox": bbox,
                "coordinate_system": "unstructured_pixels" if bbox else None,
            },
            "provenance": {
                "source_filename": filename,
                "extraction_method": "unstructured_api",
            }
        })

    return candidates
