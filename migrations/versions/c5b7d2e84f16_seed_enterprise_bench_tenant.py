"""Seed the EnterpriseRAG-Bench tenant

Revision ID: c5b7d2e84f16
Revises: 8c4e1a9f2b10
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c5b7d2e84f16"
down_revision: Union[str, None] = "8c4e1a9f2b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BENCH_TENANT = "00000000-0000-4000-8000-0000000000be"


def upgrade() -> None:
    # Owns the benchmark corpus that scripts/ingest_enterprise_bench.py loads,
    # and is reachable only through the demo identities in
    # srag.api.auth._demo_identities(), which the app refuses to serve outside
    # development and testing. Same reasoning as b2a1e0c360f0: no runtime
    # caller in production, so no row there.
    from srag.settings import get_settings

    if get_settings().is_production:
        return

    op.execute(
        f"""
        INSERT INTO tenants (id, name, created_at)
        VALUES ('{BENCH_TENANT}', 'EnterpriseRAG-Bench', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM tenants WHERE id = '{BENCH_TENANT}'")
