"""Deterministic citation verification against the authorized bundle.

The model is untrusted. evidence_id + quote prove the claim; citation
metadata is always stamped from the authorized bundle item.
"""

from __future__ import annotations

from srag.contracts.bundle import EvidenceBundle, EvidenceBundleItem
from srag.contracts.generation import LLMResponse, VerifiedClaim, VerifiedResponse

ABSTENTION = "I don't have enough authorized evidence to answer that."


def _normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def _content_text(item: EvidenceBundleItem) -> str:
    if isinstance(item.content, dict):
        return str(item.content)
    return item.content or ""


def _quote_supported(quote: str, content: str) -> bool:
    if not quote.strip() or not content.strip():
        return False
    return _normalize(quote) in _normalize(content)


class CitationVerifier:
    @staticmethod
    def verify(bundle: EvidenceBundle, llm_response: LLMResponse) -> VerifiedResponse:
        evidence_map = {item.evidence_id: item for item in bundle.items}
        verified_claims: list[VerifiedClaim] = []

        for claim in llm_response.claims:
            evidence_item = evidence_map.get(claim.evidence_id)
            if not evidence_item:
                verified_claims.append(
                    VerifiedClaim(
                        claim=claim.claim,
                        evidence_id=claim.evidence_id,
                        supporting_quote=claim.supporting_quote,
                        is_verified=False,
                        verification_error=f"Unauthorized or fabricated evidence ID: {claim.evidence_id}",
                    )
                )
                continue

            if not _quote_supported(claim.supporting_quote, _content_text(evidence_item)):
                verified_claims.append(
                    VerifiedClaim(
                        claim=claim.claim,
                        evidence_id=claim.evidence_id,
                        supporting_quote=claim.supporting_quote,
                        citation_location=evidence_item.citation_location,
                        is_verified=False,
                        verification_error="Supporting quote not found in the referenced evidence.",
                    )
                )
                continue

            verified_claims.append(
                VerifiedClaim(
                    claim=claim.claim,
                    evidence_id=evidence_item.evidence_id,
                    supporting_quote=claim.supporting_quote,
                    document_id=evidence_item.document_id,
                    element_type=str(evidence_item.element_type),
                    page_number=evidence_item.page_number,
                    element_id=evidence_item.element_id,
                    bbox=evidence_item.bbox,
                    citation_location=evidence_item.citation_location,
                    is_verified=True,
                    verification_error=None,
                )
            )

        return VerifiedResponse(answer=llm_response.answer, claims=verified_claims)

    @staticmethod
    def fail_closed(verified: VerifiedResponse) -> VerifiedResponse:
        kept = [claim for claim in verified.claims if claim.is_verified]
        if not kept:
            return VerifiedResponse(
                answer=ABSTENTION,
                claims=[],
                abstained=True,
                abstention_reason="unverified_or_missing_claims",
            )
        return VerifiedResponse(answer=verified.answer, claims=kept, abstained=False)
