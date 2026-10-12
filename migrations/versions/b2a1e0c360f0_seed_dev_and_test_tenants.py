"""Seed dev and test tenants

Revision ID: b2a1e0c360f0
Revises: f3a9c2e71b04
Create Date: 2026-10-05 22:04:06.259993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2a1e0c360f0'
down_revision: Union[str, None] = 'f3a9c2e71b04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # These rows exist only for the demo/canary identities in
    # srag.api.auth._demo_identities(), which the app itself refuses to serve
    # outside development/testing (Settings.allows_dev_token). Seeding them
    # into a production database would be an avoidable artifact with no
    # runtime caller, so skip them there.
    from srag.settings import get_settings

    if get_settings().is_production:
        return

    op.execute("""
        INSERT INTO tenants (id, name, created_at)
        VALUES
            ('00000000-0000-4000-8000-000000000001', 'Development Tenant', CURRENT_TIMESTAMP),
            ('00000000-0000-0000-0000-00000000000a', 'Tenant A (Canary)', CURRENT_TIMESTAMP),
            ('00000000-0000-0000-0000-00000000000b', 'Tenant B (Canary)', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM tenants 
        WHERE id IN (
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-0000-0000-00000000000a',
            '00000000-0000-0000-0000-00000000000b'
        );
    """)
