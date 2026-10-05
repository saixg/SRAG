"""Tests for domain contracts — verifying typed models work correctly."""

from __future__ import annotations

import uuid
from datetime import datetime

from srag.contracts.evidence import (
    EvidenceType,
    EvidenceUnit,
    Provenance,
    SourceLocation,
)
from srag.contracts.health import ComponentHealth, HealthResponse, ServiceStatus
from srag.contracts.identity import TenantContext, UserIdentity


class TestHealthContracts:
    """Tests for health-related contracts."""

    def test_health_response_creation(self):
        """HealthResponse should serialize correctly."""
        response = HealthResponse(
            status=ServiceStatus.HEALTHY,
            version="0.1.0",
            environment="testing",
        )
        assert response.status == ServiceStatus.HEALTHY
        assert response.version == "0.1.0"
        data = response.model_dump()
        assert data["status"] == "healthy"

    def test_component_health_creation(self):
        """ComponentHealth should accept all status values."""
        for status in ServiceStatus:
            component = ComponentHealth(name="test", status=status)
            assert component.status == status


class TestIdentityContracts:
    """Tests for identity/tenant contracts."""

    def test_tenant_context_creation(self):
        """TenantContext should hold tenant_id and name."""
        tid = uuid.uuid4()
        tenant = TenantContext(tenant_id=tid, tenant_name="Acme Corp")
        assert tenant.tenant_id == tid
        assert tenant.tenant_name == "Acme Corp"

    def test_user_identity_creation(self):
        """UserIdentity should carry user, tenant, and roles."""
        tid = uuid.uuid4()
        uid = uuid.uuid4()
        tenant = TenantContext(tenant_id=tid, tenant_name="Acme Corp")
        user = UserIdentity(
            user_id=uid,
            tenant=tenant,
            email="engineer@acme.com",
            roles=["analyst", "viewer"],
        )
        assert user.user_id == uid
        assert user.tenant_id == tid  # convenience property
        assert user.email == "engineer@acme.com"
        assert "analyst" in user.roles
        assert isinstance(user.authenticated_at, datetime)

    def test_user_identity_default_roles(self):
        """UserIdentity should default to empty roles list."""
        tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="Test")
        user = UserIdentity(user_id=uuid.uuid4(), tenant=tenant)
        assert user.roles == []


class TestEvidenceContracts:
    """Tests for the EvidenceUnit domain model."""

    def test_evidence_unit_text(self):
        """EvidenceUnit should support text evidence."""
        unit = EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.TEXT,
            text_content="The valve connects subsystem A to pump B.",
        )
        assert unit.element_type == EvidenceType.TEXT
        assert unit.text_content is not None
        assert unit.evidence_id is not None  # auto-generated

    def test_evidence_unit_table(self):
        """EvidenceUnit should support table evidence with structured content."""
        unit = EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.TABLE,
            structured_content={
                "headers": ["Component", "Pressure (PSI)"],
                "rows": [["Valve A", "150"], ["Pump B", "200"]],
            },
        )
        assert unit.element_type == EvidenceType.TABLE
        assert unit.structured_content is not None
        assert "headers" in unit.structured_content

    def test_evidence_unit_image(self):
        """EvidenceUnit should support image evidence via visual reference."""
        unit = EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.IMAGE,
            visual_reference_id="img_abc123",
        )
        assert unit.element_type == EvidenceType.IMAGE
        assert unit.visual_reference_id == "img_abc123"

    def test_evidence_unit_all_types(self):
        """All EvidenceType values should be constructable."""
        tid = uuid.uuid4()
        did = uuid.uuid4()
        for etype in EvidenceType:
            unit = EvidenceUnit(
                tenant_id=tid,
                document_id=did,
                element_type=etype,
                text_content=f"test {etype.value}",
            )
            assert unit.element_type == etype

    def test_evidence_unit_carries_tenant_id(self):
        """Every EvidenceUnit must carry tenant_id for RLS enforcement."""
        tid = uuid.uuid4()
        unit = EvidenceUnit(
            tenant_id=tid,
            document_id=uuid.uuid4(),
            element_type=EvidenceType.TEXT,
            text_content="secure evidence",
        )
        assert unit.tenant_id == tid

    def test_source_location(self):
        """SourceLocation should capture page, bbox, and section."""
        loc = SourceLocation(
            page_number=3,
            bbox=[0.1, 0.2, 0.8, 0.9],
            section="Section 4.2",
        )
        assert loc.page_number == 3
        assert len(loc.bbox) == 4

    def test_provenance(self):
        """Provenance should track extraction metadata."""
        prov = Provenance(
            source_filename="manual_v2.pdf",
            extraction_method="docling",
            extraction_version="1.0.0",
        )
        assert prov.source_filename == "manual_v2.pdf"
        assert isinstance(prov.extracted_at, datetime)

    def test_evidence_unit_serialization(self):
        """EvidenceUnit should serialize/deserialize cleanly."""
        unit = EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.DIAGRAM,
            text_content="Flow diagram showing subsystem connections",
            source_location=SourceLocation(page_number=7),
            provenance=Provenance(
                source_filename="engineering_manual.pdf",
                extraction_method="docling",
            ),
        )
        data = unit.model_dump()
        restored = EvidenceUnit.model_validate(data)
        assert restored.evidence_id == unit.evidence_id
        assert restored.element_type == EvidenceType.DIAGRAM
        assert restored.provenance is not None
        assert restored.provenance.source_filename == "engineering_manual.pdf"
