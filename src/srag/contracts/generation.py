"""Contracts for LLM generation and citation verification."""

from pydantic import BaseModel, Field

from srag.contracts.citation import CitationInspect


class Claim(BaseModel):
    claim: str
    evidence_id: str
    supporting_quote: str
    document_id: str | None = None
    element_type: str | None = None
    page_number: int | None = None
    element_id: str | None = None
    bbox: list[float] | None = None


class LLMResponse(BaseModel):
    answer: str
    claims: list[Claim]


class VerifiedClaim(BaseModel):
    claim: str
    evidence_id: str
    supporting_quote: str | None = None
    document_id: str | None = None
    element_type: str | None = None
    page_number: int | None = None
    element_id: str | None = None
    bbox: list[float] | None = None
    citation_location: str | None = None
    is_verified: bool
    verification_error: str | None = None


class VerifiedResponse(BaseModel):
    answer: str
    claims: list[VerifiedClaim]
    abstained: bool = False
    abstention_reason: str | None = None
    citations: list[CitationInspect] = Field(default_factory=list)
