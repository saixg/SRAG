"""Ingest Employee.csv into the development tenant as text evidence units."""

from __future__ import annotations

import asyncio
import csv
import hashlib
import sys
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from srag.api.auth import DEV_TENANT_ID
from srag.contracts.evidence import EvidenceType
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.settings import get_settings


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    csv_path = Path(__file__).parent.parent / "data" / "Employee.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        await engine.dispose()
        return

    embedder = HashingEmbedder(dimension=settings.embedder_dimension)
    raw = csv_path.read_bytes()
    content_hash = hashlib.sha256(raw).hexdigest()

    async with factory() as session:
        await session.execute(
            text("SELECT set_config('app.current_tenant_id', :tid, true)"),
            {"tid": str(DEV_TENANT_ID)},
        )
        await session.execute(text("SET LOCAL ROLE authenticated"))
        existing = (
            await session.execute(select(Tenant).where(Tenant.id == DEV_TENANT_ID))
        ).scalar_one_or_none()
        if existing is None:
            session.add(Tenant(id=DEV_TENANT_ID, name="Development Tenant"))
            await session.flush()

        doc = Document(
            tenant_id=DEV_TENANT_ID,
            filename="Employee.csv",
            content_hash=content_hash,
        )
        session.add(doc)
        await session.flush()

        units = []
        with csv_path.open(encoding="utf-8") as handle:
            for index, row in enumerate(csv.DictReader(handle)):
                text_content = (
                    f"Employee Profile: {row.get('Age', 'Unknown')} year old "
                    f"{row.get('Gender', 'Unknown')} with a {row.get('Education', 'Unknown')} degree, "
                    f"working in {row.get('City', 'Unknown')}. "
                    f"Joined in {row.get('JoiningYear', 'Unknown')}, "
                    f"Payment Tier {row.get('PaymentTier', 'Unknown')}. "
                    f"Experience: {row.get('ExperienceInCurrentDomain', 'Unknown')} years. "
                    f"Ever Benched: {row.get('EverBenched', 'No')}. "
                    f"Leave status: {'Left' if row.get('LeaveOrNot') == '1' else 'Active'}."
                )
                units.append(
                    EvidenceUnitModel(
                        tenant_id=DEV_TENANT_ID,
                        document_id=doc.id,
                        element_id=f"row_{index}",
                        element_type=EvidenceType.TEXT.value,
                        text_content=text_content,
                        structured_content=row,
                        embedding=embedder.embed_text(text_content),
                        provenance={
                            "source_filename": "Employee.csv",
                            "extraction_method": "csv_row",
                        },
                    )
                )
        session.add_all(units)
        await session.commit()
        print(f"Ingested {len(units)} employee rows for tenant {DEV_TENANT_ID}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
