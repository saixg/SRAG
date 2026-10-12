"""Evidence Bundle Builder — securely constructs authorized LLM context."""

import logging

from srag.authz import role_allows
from srag.contracts.bundle import EvidenceBundle, EvidenceBundleItem
from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.retrieval.types import SearchResult

logger = logging.getLogger(__name__)


class SecurityRejectionError(Exception):
    """Raised when evidence fails security constraints and must be rejected."""

    pass


class EvidenceBundleBuilder:
    """Builds a secure EvidenceBundle from raw SearchResults.

    Enforces that:
    1. Every evidence unit belongs to the requesting tenant (fail closed).
    2. Every evidence unit has required provenance.
    3. Content is properly formatted for citation.
    4. No unauthorized metadata is leaked.
    """

    @staticmethod
    def build(
        tenant: TenantContext,
        query: str,
        search_results: list[SearchResult],
        roles: list[str] | None = None,
        collections: list[str] | None = None,
    ) -> EvidenceBundle:
        """Builds an authorized bundle from search results."""
        items: list[EvidenceBundleItem] = []

        for result in search_results:
            evidence = result.evidence

            if evidence.tenant_id != tenant.tenant_id:
                logger.error(
                    "Cross-tenant leakage detected! Evidence %s belongs to %s but requested by %s",
                    evidence.evidence_id,
                    evidence.tenant_id,
                    tenant.tenant_id,
                )
                raise SecurityRejectionError("Cross-tenant evidence leakage detected.")

            if not role_allows(roles, collections, evidence.security_scope):
                logger.warning(
                    "Skipping evidence %s: role or collection scope", evidence.evidence_id
                )
                continue

            if not evidence.provenance or not evidence.provenance.source_filename:
                logger.warning("Skipping evidence %s: missing provenance", evidence.evidence_id)
                continue
            if (
                not evidence.text_content
                and not evidence.structured_content
                and not evidence.visual_reference_id
            ):
                logger.warning("Skipping evidence %s: missing content", evidence.evidence_id)
                continue

            # 4. Format citation-ready location
            citation_parts = [f"Document: {evidence.provenance.source_filename}"]

            page_number = None
            bbox = None
            coordinate_system = None
            if evidence.source_location:
                page_number = evidence.source_location.page_number
                bbox = evidence.source_location.bbox
                coordinate_system = evidence.source_location.coordinate_system
                if page_number is not None:
                    citation_parts.append(f"Page: {page_number}")
                if bbox and evidence.element_type in (
                    EvidenceType.OCR,
                    EvidenceType.IMAGE,
                    EvidenceType.FIGURE,
                ):
                    citation_parts.append(f"Bbox: {bbox}")
                if evidence.source_location.section:
                    citation_parts.append(f"Section: {evidence.source_location.section}")

            # Table specific citation info if page/bbox wasn't enough
            if evidence.element_type == EvidenceType.TABLE and evidence.element_id:
                citation_parts.append(f"Table ID: {evidence.element_id}")

            citation_location = ", ".join(citation_parts)

            content = (
                evidence.text_content if evidence.text_content else evidence.structured_content
            )

            # 5. Construct the safe bundle item
            item = EvidenceBundleItem(
                evidence_id=str(evidence.evidence_id),
                document_id=str(evidence.document_id),
                element_type=evidence.element_type,
                content=content,
                visual_reference_id=evidence.visual_reference_id,
                citation_location=citation_location,
                source_filename=evidence.provenance.source_filename,
                page_number=page_number,
                element_id=evidence.element_id,
                bbox=bbox,
                coordinate_system=coordinate_system,
                relevance_score=result.score,
            )
            items.append(item)

        return EvidenceBundle(
            tenant_id=tenant.tenant_id,
            query=query,
            items=items,
        )
