"""End-to-end tests for Phase 2C query endpoint."""

import uuid

import pytest
from httpx import AsyncClient

from sqlalchemy import func
from srag.api.auth import DEV_TENANT_ID
from srag.contracts.evidence import EvidenceType
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.api.search import get_retrieval_engine
from srag.api.query import get_llm_client
from srag.retrieval.engine import RetrievalEngine
from srag.ingestion.embedder import HashingEmbedder
from srag.generation.generator import LLMClient
from srag.contracts.generation import LLMResponse, Claim
from srag.contracts.bundle import EvidenceBundle

class CustomStubLLMClient(LLMClient):
    """A stub LLM that correctly hallucinates or cites based on query."""
    async def generate(self, query: str, bundle: EvidenceBundle) -> LLMResponse:
        if not bundle.items:
            return LLMResponse(answer="I couldn't find anything.", claims=[])
            
        first = bundle.items[0]
        content_str = str(first.content) if isinstance(first.content, dict) else first.content
        quote = content_str[:15] if content_str else ""
        
        # If query asks for hallucination, we mess up the page number
        if "hallucinate" in query:
            return LLMResponse(
                answer="Here is some made up citation.",
                claims=[
                    Claim(
                        claim="This is false.",
                        evidence_id="fabricated-evidence-id",
                        supporting_quote=quote,
                        document_id=first.document_id,
                        element_type=first.element_type,
                        page_number=first.page_number,
                        element_id=first.element_id,
                        bbox=first.bbox,
                    )
                ]
            )
            
        return LLMResponse(
            answer="Here is the correct answer.",
            claims=[
                Claim(
                    claim="This is correct.",
                    evidence_id=first.evidence_id,
                    supporting_quote=quote,
                    document_id=first.document_id,
                    element_type=first.element_type,
                    page_number=first.page_number,
                    element_id=first.element_id,
                    bbox=first.bbox,
                )
            ]
        )

@pytest.mark.asyncio
async def test_query_phase2c_e2e(client: AsyncClient, db_session, app):
    """Test full e2e flow: RLS -> MultiModal Bundle -> Context -> LLM -> Verifier"""
    tenant_id = uuid.uuid4()
    
    tenant_obj = Tenant(id=tenant_id, name="Test Tenant E2E")
    db_session.add(tenant_obj)
        
    doc = Document(id=uuid.uuid4(), tenant_id=tenant_id, filename="e2e.pdf", content_hash="hash_e2e")
    db_session.add(doc)
    
    u1 = EvidenceUnitModel(
        tenant_id=tenant_id,
        document_id=doc.id,
        element_type=EvidenceType.TABLE.value,
        element_id="table_x",
        text_content="financial e2e report data",
        structured_content={"raw": "csv"},
        embedding=[0.5]*1024,
        source_location={"page_number": 5, "bbox": [10.0, 20.0, 100.0, 50.0], "coordinate_system": "docling"},
        provenance={"source_filename": "e2e.pdf", "extraction_method": "docling"}
    )
    
    db_session.add(u1)
    await db_session.commit()
    
    from srag.api.auth import get_current_user
    from srag.contracts.identity import UserIdentity, TenantContext
    
    app.dependency_overrides[get_current_user] = lambda: UserIdentity(
        user_id=uuid.uuid4(),
        email="test@e2e.com",
        roles=["user"],
        tenant=TenantContext(tenant_id=tenant_id, tenant_name="T")
    )
    
    embedder = HashingEmbedder()
    embedder.embed_text = lambda q: [0.5]*1024 if "financial e2e" in q else [0.0]*1024
    
    app.dependency_overrides[get_retrieval_engine] = lambda: RetrievalEngine(embedder=embedder)
    app.dependency_overrides[get_llm_client] = lambda: CustomStubLLMClient()
    
    try:
        # Valid Query
        response = await client.post(
            "/api/v1/query",
            headers={"Authorization": "Bearer anything"}, # Overridden
            json={"query": "financial e2e report data", "top_k": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Here is the correct answer."
        assert len(data["claims"]) == 1
        claim = data["claims"][0]
        assert claim["is_verified"] is True
        assert claim["document_id"] == str(doc.id)
        assert claim["element_type"] == EvidenceType.TABLE.value
        assert claim["page_number"] == 5
        assert claim["element_id"] == "table_x"
        assert claim["bbox"] == [10.0, 20.0, 100.0, 50.0]
        
        # Hallucinated Query
        response_hallucinated = await client.post(
            "/api/v1/query",
            headers={"Authorization": "Bearer anything"},
            json={"query": "financial e2e hallucinate", "top_k": 5}
        )
        assert response_hallucinated.status_code == 200
        data_hallucinated = response_hallucinated.json()
        assert data_hallucinated["abstained"] is True
        assert data_hallucinated["claims"] == []
        assert "authorized evidence" in data_hallucinated["answer"]
        
    finally:
        app.dependency_overrides.pop(get_retrieval_engine, None)
        app.dependency_overrides.pop(get_llm_client, None)
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_query_empty_retrieval_abstention(client: AsyncClient, app):
    """Test that empty retrieval causes deterministic abstention without calling LLM."""
    
    class EmptyRetrievalEngine:
        async def search(self, *args, **kwargs):
            return []
            
    app.dependency_overrides[get_retrieval_engine] = lambda: EmptyRetrievalEngine()
    app.dependency_overrides[get_llm_client] = lambda: CustomStubLLMClient()
    
    try:
        response = await client.post(
            "/api/v1/query",
            headers={"Authorization": "Bearer dev_token_123"},
            json={"query": "nothing matches this", "top_k": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # In query.py we hardcoded the abstention string if bundle.items is empty
        assert data["answer"] == "I don't have enough authorized evidence to answer that."
        assert len(data["claims"]) == 0
        
    finally:
        app.dependency_overrides.pop(get_retrieval_engine, None)
        app.dependency_overrides.pop(get_llm_client, None)
