"""Tests for deterministic citation verification."""

import uuid

from srag.contracts.bundle import EvidenceBundle, EvidenceBundleItem
from srag.contracts.evidence import EvidenceType
from srag.contracts.generation import Claim, LLMResponse
from srag.generation.verifier import CitationVerifier


def create_mock_bundle() -> EvidenceBundle:
    return EvidenceBundle(
        tenant_id=uuid.uuid4(),
        query="What is the deadline?",
        items=[
            EvidenceBundleItem(
                evidence_id="ev_123",
                document_id="doc_1",
                element_type=EvidenceType.TEXT,
                content="The project deadline is 15 October 2026.",
                citation_location="Document: policy.pdf, Page: 5",
                source_filename="policy.pdf",
                relevance_score=0.99,
            )
        ],
    )


def test_verifier_passes_valid_claim():
    """Verifier should pass a claim that exactly matches the evidence and quote."""
    bundle = create_mock_bundle()
    llm_response = LLMResponse(
        answer="The project deadline is 15 October 2026.",
        claims=[
            Claim(
                claim="The project deadline is 15 October 2026.",
                evidence_id="ev_123",
                supporting_quote="Project deadline is 15 October",  # exact substring match
            )
        ],
    )
    # Adjust quote to actually match the bundle exactly (case sensitive in current implementation)
    llm_response.claims[0].supporting_quote = "project deadline is 15 October 2026"

    verified_response = CitationVerifier.verify(bundle, llm_response)

    assert len(verified_response.claims) == 1
    verified_claim = verified_response.claims[0]
    assert verified_claim.is_verified is True
    assert verified_claim.verification_error is None
    assert verified_claim.citation_location == "Document: policy.pdf, Page: 5"


def test_verifier_rejects_fabricated_evidence_id():
    """Verifier should reject claims using evidence_ids not in the bundle."""
    bundle = create_mock_bundle()
    llm_response = LLMResponse(
        answer="I made this up.",
        claims=[
            Claim(
                claim="Some fake claim.",
                evidence_id="ev_999",  # Does not exist
                supporting_quote="Doesn't matter",
            )
        ],
    )

    verified_response = CitationVerifier.verify(bundle, llm_response)

    assert len(verified_response.claims) == 1
    verified_claim = verified_response.claims[0]
    assert verified_claim.is_verified is False
    assert "Unauthorized or fabricated evidence ID" in verified_claim.verification_error


def test_verifier_rejects_hallucinated_quote():
    """Verifier should reject claims where the quote is not in the evidence text."""
    bundle = create_mock_bundle()
    llm_response = LLMResponse(
        answer="The deadline is in November.",
        claims=[
            Claim(
                claim="The deadline is in November.",
                evidence_id="ev_123",  # Valid ID
                supporting_quote="deadline is in November",  # Hallucinated quote
            )
        ],
    )

    verified_response = CitationVerifier.verify(bundle, llm_response)

    assert len(verified_response.claims) == 1
    verified_claim = verified_response.claims[0]
    assert verified_claim.is_verified is False
    assert "Supporting quote not found" in verified_claim.verification_error


def test_verifier_stamps_bundle_document_id_when_model_uses_filename():
    bundle = create_mock_bundle()
    llm_response = LLMResponse(
        answer="The project deadline is 15 October 2026.",
        claims=[
            Claim(
                claim="The project deadline is 15 October 2026.",
                evidence_id="ev_123",
                supporting_quote="project deadline is 15 October 2026",
                document_id="policy.pdf",
            )
        ],
    )
    verified = CitationVerifier.verify(bundle, llm_response)
    assert verified.claims[0].is_verified is True
    assert verified.claims[0].document_id == "doc_1"


def test_fail_closed_strips_unverified_answer():
    from srag.generation.verifier import ABSTENTION, CitationVerifier

    bundle = create_mock_bundle()
    llm_response = LLMResponse(
        answer="The deadline is in November.",
        claims=[
            Claim(
                claim="The deadline is in November.",
                evidence_id="ev_123",
                supporting_quote="deadline is in November",
            )
        ],
    )
    closed = CitationVerifier.fail_closed(CitationVerifier.verify(bundle, llm_response))
    assert closed.abstained is True
    assert closed.answer == ABSTENTION
    assert closed.claims == []
